package br.com.aurora.features.expenses.listexpenses;

import br.com.aurora.features.expenses.ExpenseServiceTestSupport;
import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class ListExpensesServiceTest extends ExpenseServiceTestSupport {

    @Autowired private ListExpensesService service;
    @Autowired private ExpenseRepository expenseRepository;

    @SuppressWarnings("null")
    @Test
    void principalSeesFamilyExpensesButDependentSeesOnlyOwn() {
        User principal = createUser(Role.PRINCIPAL, "list-principal@aurora.com", null);
        User dependent = createUser(Role.DEPENDENTE, "list-dependent@aurora.com", principal.getFamilyGroup());
        saveExpense(principal, "150.00");
        saveExpense(dependent, "40.00");

        setAuthenticatedUser(principal);
        assertThat(service.listExpenses(new ListExpensesFilter(null, null, null, null))).hasSize(2);

        setAuthenticatedUser(dependent);
        assertThat(service.listExpenses(new ListExpensesFilter(null, null, null, null)))
                .extracting(ListExpensesResponse::userId)
                .containsExactly(dependent.getId());
        assertThatThrownBy(() -> service.listExpenses(new ListExpensesFilter(null, null, null, principal.getId())))
                .isInstanceOf(AccessDeniedException.class);
    }

    private void saveExpense(User user, String amount) {
        expenseRepository.save(Expense.builder()
                .familyGroup(user.getFamilyGroup())
                .user(user)
                .amount(new BigDecimal(amount))
                .expenseDate(LocalDate.now())
                .category("Casa")
                .paymentMethod(ExpensePaymentMethod.PIX)
                .build());
    }
}
