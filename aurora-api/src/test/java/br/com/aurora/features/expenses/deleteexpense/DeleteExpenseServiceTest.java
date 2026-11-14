package br.com.aurora.features.expenses.deleteexpense;

import br.com.aurora.features.expenses.ExpenseServiceTestSupport;
import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.ExpenseStatus;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class DeleteExpenseServiceTest extends ExpenseServiceTestSupport {

    @Autowired private DeleteExpenseService service;
    @Autowired private ExpenseRepository expenseRepository;

    @Test
    void cancellationPreservesExpenseAndHidesItFromActiveLists() {
        User principal = createUser(Role.PRINCIPAL, "delete-principal@aurora.com", null);
        setAuthenticatedUser(principal);
        Expense expense = expenseRepository.save(Expense.builder()
                .familyGroup(principal.getFamilyGroup())
                .user(principal)
                .amount(new BigDecimal("22.50"))
                .expenseDate(LocalDate.now())
                .category("Lazer")
                .paymentMethod(ExpensePaymentMethod.PIX)
                .build());

        service.deleteExpense(expense.getId());

        Expense cancelled = expenseRepository.findById(expense.getId()).orElseThrow();
        assertThat(cancelled.getStatus()).isEqualTo(ExpenseStatus.CANCELADO);
        assertThat(cancelled.getCancelledBy().getId()).isEqualTo(principal.getId());
        assertThat(cancelled.getCancelledAt()).isNotNull();
        assertThat(expenseRepository.findByFamilyGroupIdAndStatusOrderByExpenseDateDesc(
                principal.getFamilyGroup().getId(),
                ExpenseStatus.ATIVO
        )).isEmpty();
    }
}
