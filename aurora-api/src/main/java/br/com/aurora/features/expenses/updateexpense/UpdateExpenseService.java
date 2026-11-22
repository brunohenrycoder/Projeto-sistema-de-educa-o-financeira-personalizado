package br.com.aurora.features.expenses.updateexpense;

import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.ExpenseStatus;
import br.com.aurora.shared.domain.CreditCardInstallment;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.CreditCardLedger;
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
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UpdateExpenseService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final CreditCardInstallmentRepository installmentRepository;
    private final CreditCardLedger creditCardLedger;

    @Transactional
    public UpdateExpenseResponse updateExpense(UUID expenseId, UpdateExpenseRequest request) {
        UsuarioAutenticado authenticatedUser = SecurityUtils.getUsuarioAutenticado()
                .orElseThrow(() -> new AccessDeniedException("Usuário não autenticado."));
        User user = findActiveUser(authenticatedUser);
        Expense expense = expenseRepository.findForUpdate(
                        expenseId, user.getFamilyGroup().getId(), ExpenseStatus.ATIVO)
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada no grupo familiar."));
        if (user.getRole() == Role.DEPENDENTE && !expense.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("Você não pode alterar despesas de outros membros.");
        }
        if (expense.getPaymentMethod() == ExpensePaymentMethod.CARTAO_CREDITO) {
            creditCardLedger.assertOpenPurchaseEditable(expense);
        }

        BigDecimal previousAmount = expense.getAmount();
        var previousExpenseDate = expense.getExpenseDate();
        ExpensePaymentMethod previousPaymentMethod = expense.getPaymentMethod();
        if (request.getAmount() != null) {
            if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new ValidationException("O valor da despesa deve ser maior que zero.");
            }
            expense.setAmount(request.getAmount());
        }
        if (request.getExpenseDate() != null) {
            expense.setExpenseDate(request.getExpenseDate());
        }
        if (request.getCategory() != null) {
            String category = request.getCategory().trim();
            if (category.isBlank()) {
                throw new ValidationException("A categoria da despesa é obrigatória.");
            }
            expense.setCategory(category);
        }
        if (request.getPaymentMethod() != null) {
            if (previousPaymentMethod == ExpensePaymentMethod.CARTAO_CREDITO
                    && request.getPaymentMethod() != ExpensePaymentMethod.CARTAO_CREDITO) {
                throw new ValidationException("Uma compra no cartão não pode mudar de forma de pagamento.");
            }
            expense.setPaymentMethod(request.getPaymentMethod());
        }
        int installmentCount = request.getInstallmentCount() == null
                ? getCurrentInstallmentCount(expense)
                : request.getInstallmentCount();
        if (expense.getPaymentMethod() != ExpensePaymentMethod.CARTAO_CREDITO && installmentCount != 1) {
            throw new ValidationException("O parcelamento só pode ser informado para despesas no cartão de crédito.");
        }
        if (request.getDescription() != null) {
            expense.setDescription(request.getDescription().trim());
        }

        expense.setUpdatedAt(LocalDateTime.now());
        expenseRepository.save(expense);
        if (previousPaymentMethod != ExpensePaymentMethod.CARTAO_CREDITO
                && expense.getPaymentMethod() == ExpensePaymentMethod.CARTAO_CREDITO) {
            creditCardLedger.registerPurchase(expense, installmentCount);
        } else if (previousPaymentMethod == ExpensePaymentMethod.CARTAO_CREDITO
                && (previousAmount.compareTo(expense.getAmount()) != 0
                || !previousExpenseDate.equals(expense.getExpenseDate())
                || request.getInstallmentCount() != null)) {
            creditCardLedger.replaceOpenPurchase(expense, installmentCount);
        }
        return toResponse(expense);
    }

    @SuppressWarnings("null")
    private int getCurrentInstallmentCount(Expense expense) {
        if (expense.getPaymentMethod() != ExpensePaymentMethod.CARTAO_CREDITO) {
            return 1;
        }
        return installmentRepository.findByExpenseIdOrderByInstallmentNumber(expense.getId())
                .stream()
                .filter(installment -> !installment.isCancelled())
                .mapToInt(CreditCardInstallment::getInstallmentCount)
                .findFirst()
                .orElse(1);
    }

    private User findActiveUser(UsuarioAutenticado authenticatedUser) {
        User user = userRepository.findById(authenticatedUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));
        if (user.getStatus() != UserStatus.ATIVO || !user.isEmailConfirmed()) {
            throw new AccessDeniedException("Usuário inativo ou sem confirmação de e-mail.");
        }
        return user;
    }

    private UpdateExpenseResponse toResponse(Expense expense) {
        return new UpdateExpenseResponse(
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
