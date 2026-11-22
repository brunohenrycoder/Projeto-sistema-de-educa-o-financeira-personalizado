package br.com.aurora.features.expenses.registerexpense;

import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.CreditCardLedger;
import br.com.aurora.shared.domain.ExpenseRepository;
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

@Service
@RequiredArgsConstructor
public class RegisterExpenseService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final CreditCardLedger creditCardLedger;

    @Transactional
    public RegisterExpenseResponse registerExpense(RegisterExpenseRequest request) {
        UsuarioAutenticado authenticatedUser = SecurityUtils.getUsuarioAutenticado()
                .orElseThrow(() -> new AccessDeniedException("Usuário não autenticado."));
        User user = findActiveUser(authenticatedUser);

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("O valor da despesa deve ser maior que zero.");
        }
        if (request.getExpenseDate() == null || request.getCategory() == null || request.getCategory().isBlank()
                || request.getPaymentMethod() == null) {
            throw new ValidationException("Data, categoria e método de pagamento são obrigatórios.");
        }
        int installmentCount = request.getInstallmentCount() == null ? 1 : request.getInstallmentCount();
        if (request.getPaymentMethod() != ExpensePaymentMethod.CARTAO_CREDITO && installmentCount != 1) {
            throw new ValidationException("O parcelamento só pode ser informado para despesas no cartão de crédito.");
        }

        Expense expense = expenseRepository.save(Expense.builder()
                .familyGroup(user.getFamilyGroup())
                .user(user)
                .amount(request.getAmount())
                .expenseDate(request.getExpenseDate())
                .category(request.getCategory().trim())
                .paymentMethod(request.getPaymentMethod())
                .description(request.getDescription() == null ? null : request.getDescription().trim())
                .build());
        if (request.getPaymentMethod() == ExpensePaymentMethod.CARTAO_CREDITO) {
            creditCardLedger.registerPurchase(expense, installmentCount);
        }

        return toResponse(expense);
    }

    private User findActiveUser(UsuarioAutenticado authenticatedUser) {
        User user = userRepository.findById(authenticatedUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));
        if (user.getStatus() != UserStatus.ATIVO || !user.isEmailConfirmed()) {
            throw new AccessDeniedException("Usuário inativo ou sem confirmação de e-mail.");
        }
        return user;
    }

    private RegisterExpenseResponse toResponse(Expense expense) {
        return RegisterExpenseResponse.builder()
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
