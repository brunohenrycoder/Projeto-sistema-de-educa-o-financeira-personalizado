package br.com.aurora.features.expenses.deleteexpense;

import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.ExpenseStatus;
import br.com.aurora.shared.domain.CreditCardLedger;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.security.SecurityUtils;
import br.com.aurora.shared.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeleteExpenseService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final CreditCardLedger creditCardLedger;

    @Transactional
    public void deleteExpense(UUID expenseId) {
        UsuarioAutenticado authenticatedUser = SecurityUtils.getUsuarioAutenticado()
                .orElseThrow(() -> new AccessDeniedException("Usuário não autenticado."));
        User user = userRepository.findById(authenticatedUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));
        if (user.getStatus() != UserStatus.ATIVO || !user.isEmailConfirmed()) {
            throw new AccessDeniedException("Usuário inativo ou sem confirmação de e-mail.");
        }

        Expense expense = expenseRepository.findForUpdate(
                        expenseId, user.getFamilyGroup().getId(), ExpenseStatus.ATIVO)
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada no grupo familiar."));
        if (user.getRole() == Role.DEPENDENTE && !expense.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("Você não pode excluir despesas de outros membros.");
        }

        if (expense.getPaymentMethod() == ExpensePaymentMethod.CARTAO_CREDITO) {
            creditCardLedger.cancelOpenPurchase(expense);
        }
        expense.setStatus(ExpenseStatus.CANCELADO);
        expense.setCancelledBy(user);
        expense.setCancelledAt(LocalDateTime.now());
        expenseRepository.save(expense);
    }
}
