package br.com.aurora.features.expenses;

import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.SecurityUtils;
import br.com.aurora.shared.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    @Transactional
    public ExpenseResponse createExpense(ExpenseRequest request) {
        UsuarioAutenticado authenticatedUser = SecurityUtils.getUsuarioAutenticado()
                .orElseThrow(() -> new AccessDeniedException("Usuário não autenticado."));

        User user = findActiveUser(authenticatedUser.getId());
        validateExpenseInput(request.getAmount(), request.getExpenseDate(), request.getCategory(), request.getPaymentMethod());

        Expense expense = Expense.builder()
                .familyGroup(user.getFamilyGroup())
                .user(user)
                .amount(request.getAmount())
                .expenseDate(request.getExpenseDate())
                .category(normalizeCategory(request.getCategory()))
                .paymentMethod(request.getPaymentMethod())
                .description(normalizeDescription(request.getDescription()))
                .build();

        Expense saved = expenseRepository.save(expense);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> listExpenses(ExpenseFilterRequest filter) {
        UsuarioAutenticado authenticatedUser = SecurityUtils.getUsuarioAutenticado()
                .orElseThrow(() -> new AccessDeniedException("Usuário não autenticado."));

        User user = findActiveUser(authenticatedUser.getId());
        List<Expense> expenses;

        if (user.getRole() == Role.PRINCIPAL) {
            expenses = expenseRepository.findByFamilyGroupIdOrderByExpenseDateDesc(user.getFamilyGroup().getId());
        } else {
            expenses = expenseRepository.findByFamilyGroupIdAndUserIdOrderByExpenseDateDesc(
                    user.getFamilyGroup().getId(),
                    user.getId()
            );
        }

        return filterExpenses(expenses, filter, user).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ExpenseResponse updateExpense(UUID expenseId, ExpenseUpdateRequest request) {
        UsuarioAutenticado authenticatedUser = SecurityUtils.getUsuarioAutenticado()
                .orElseThrow(() -> new AccessDeniedException("Usuário não autenticado."));

        User currentUser = findActiveUser(authenticatedUser.getId());
        Expense expense = expenseRepository.findByIdAndFamilyGroupId(expenseId, currentUser.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada no grupo familiar."));

        if (currentUser.getRole() == Role.DEPENDENTE && !expense.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Você não pode alterar despesas de outros membros.");
        }

        if (request.getAmount() != null) {
            validateAmount(request.getAmount());
            expense.setAmount(request.getAmount());
        }
        if (request.getExpenseDate() != null) {
            expense.setExpenseDate(request.getExpenseDate());
        }
        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            expense.setCategory(normalizeCategory(request.getCategory()));
        }
        if (request.getPaymentMethod() != null) {
            expense.setPaymentMethod(request.getPaymentMethod());
        }
        if (request.getDescription() != null) {
            expense.setDescription(normalizeDescription(request.getDescription()));
        }

        expense.setUpdatedAt(LocalDateTime.now());
        return toResponse(expenseRepository.save(expense));
    }

    @Transactional
    public void deleteExpense(UUID expenseId) {
        UsuarioAutenticado authenticatedUser = SecurityUtils.getUsuarioAutenticado()
                .orElseThrow(() -> new AccessDeniedException("Usuário não autenticado."));

        User currentUser = findActiveUser(authenticatedUser.getId());
        Expense expense = expenseRepository.findByIdAndFamilyGroupId(expenseId, currentUser.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada no grupo familiar."));

        if (currentUser.getRole() == Role.DEPENDENTE && !expense.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Você não pode excluir despesas de outros membros.");
        }

        expenseRepository.delete(expense);
    }

    private User findActiveUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));
        if (user.getStatus() != UserStatus.ATIVO || !user.isEmailConfirmed()) {
            throw new AccessDeniedException("Usuário inativo ou sem confirmação de e-mail.");
        }
        return user;
    }

    private List<Expense> filterExpenses(List<Expense> expenses, ExpenseFilterRequest filter, User currentUser) {
        if (filter == null) {
            return expenses;
        }

        if (filter.getStartDate() != null || filter.getEndDate() != null) {
            LocalDate start = filter.getStartDate() != null ? filter.getStartDate() : LocalDate.of(1970, 1, 1);
            LocalDate end = filter.getEndDate() != null ? filter.getEndDate() : LocalDate.now().plusYears(100);
            expenses = expenses.stream()
                    .filter(expense -> !expense.getExpenseDate().isBefore(start) && !expense.getExpenseDate().isAfter(end))
                    .toList();
        }

        if (filter.getCategory() != null && !filter.getCategory().isBlank()) {
            String category = normalizeCategory(filter.getCategory());
            expenses = expenses.stream()
                    .filter(expense -> expense.getCategory().equalsIgnoreCase(category))
                    .toList();
        }

        if (filter.getMemberId() != null) {
            if (currentUser.getRole() == Role.DEPENDENTE && !Objects.equals(filter.getMemberId(), currentUser.getId())) {
                throw new AccessDeniedException("Dependentes só podem consultar suas próprias despesas.");
            }
            expenses = expenses.stream()
                    .filter(expense -> expense.getUser().getId().equals(filter.getMemberId()))
                    .toList();
        }

        return expenses;
    }

    private void validateExpenseInput(BigDecimal amount, LocalDate expenseDate, String category, ExpensePaymentMethod paymentMethod) {
        validateAmount(amount);
        if (expenseDate == null) {
            throw new ValidationException("A data da despesa é obrigatória.");
        }
        if (category == null || category.isBlank()) {
            throw new ValidationException("A categoria da despesa é obrigatória.");
        }
        if (paymentMethod == null) {
            throw new ValidationException("O método de pagamento é obrigatório.");
        }
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("O valor da despesa deve ser maior que zero.");
        }
    }

    private String normalizeCategory(String category) {
        if (category == null) {
            throw new ValidationException("A categoria da despesa é obrigatória.");
        }
        String normalized = category.trim();
        if (normalized.isBlank()) {
            throw new ValidationException("A categoria da despesa é obrigatória.");
        }
        return normalized;
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        return description.trim();
    }

    private ExpenseResponse toResponse(Expense expense) {
        return ExpenseResponse.builder()
                .id(expense.getId())
                .familyGroupId(expense.getFamilyGroup().getId())
                .userId(expense.getUser().getId())
                .userName(expense.getUser().getName())
                .userRole(expense.getUser().getRole())
                .amount(expense.getAmount())
                .expenseDate(expense.getExpenseDate())
                .category(expense.getCategory())
                .paymentMethod(expense.getPaymentMethod())
                .description(expense.getDescription())
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .build();
    }
}
