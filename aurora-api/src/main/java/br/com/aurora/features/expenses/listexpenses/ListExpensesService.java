package br.com.aurora.features.expenses.listexpenses;

import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.ExpenseStatus;
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

import java.util.List;

@Service
@RequiredArgsConstructor
public class ListExpensesService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ListExpensesResponse> listExpenses(ListExpensesFilter filter) {
        UsuarioAutenticado authenticatedUser = SecurityUtils.getUsuarioAutenticado()
                .orElseThrow(() -> new AccessDeniedException("Usuário não autenticado."));
        User user = findActiveUser(authenticatedUser);

        if (filter != null && filter.startDate() != null && filter.endDate() != null
                && filter.startDate().isAfter(filter.endDate())) {
            throw new ValidationException("A data inicial não pode ser posterior à data final.");
        }
        if (filter != null && filter.memberId() != null
                && user.getRole() == Role.DEPENDENTE
                && !filter.memberId().equals(user.getId())) {
            throw new AccessDeniedException("Dependentes só podem consultar suas próprias despesas.");
        }

        List<Expense> expenses = user.getRole() == Role.PRINCIPAL
                ? expenseRepository.findByFamilyGroupIdAndStatusOrderByExpenseDateDesc(
                        user.getFamilyGroup().getId(), ExpenseStatus.ATIVO)
                : expenseRepository.findByFamilyGroupIdAndUserIdAndStatusOrderByExpenseDateDesc(
                        user.getFamilyGroup().getId(), user.getId(), ExpenseStatus.ATIVO);

        if (filter == null) {
            return expenses.stream().map(this::toResponse).toList();
        }
        return expenses.stream()
                .filter(expense -> filter.startDate() == null || !expense.getExpenseDate().isBefore(filter.startDate()))
                .filter(expense -> filter.endDate() == null || !expense.getExpenseDate().isAfter(filter.endDate()))
                .filter(expense -> filter.category() == null || filter.category().isBlank()
                        || expense.getCategory().equalsIgnoreCase(filter.category().trim()))
                .filter(expense -> filter.memberId() == null
                        || expense.getUser().getId().equals(filter.memberId()))
                .map(this::toResponse)
                .toList();
    }

    private User findActiveUser(UsuarioAutenticado authenticatedUser) {
        User user = userRepository.findById(authenticatedUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));
        if (user.getStatus() != UserStatus.ATIVO || !user.isEmailConfirmed()) {
            throw new AccessDeniedException("Usuário inativo ou sem confirmação de e-mail.");
        }
        return user;
    }

    private ListExpensesResponse toResponse(Expense expense) {
        return new ListExpensesResponse(
                expense.getId(),
                expense.getFamilyGroup().getId(),
                expense.getUser().getId(),
                expense.getUser().getName(),
                expense.getUser().getRole(),
                expense.getAmount(),
                expense.getExpenseDate(),
                expense.getCategory(),
                expense.getPaymentMethod(),
                expense.getDescription(),
                expense.getCreatedAt(),
                expense.getUpdatedAt()
        );
    }
}
