package br.com.aurora.features.expenses.listexpenses;

import br.com.aurora.features.expenses.ExpenseServiceTestSupport;
import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.error.ValidationException;
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

    @SuppressWarnings("null")
@Test
    void principalCanFilterByCategoryPeriodAndCombination() {
        User principal = createUser(Role.PRINCIPAL, "list-filters@aurora.com", null);
        saveExpense(principal, "150.00", LocalDate.of(2026, 11, 18), "Casa");
        saveExpense(principal, "40.00", LocalDate.of(2026, 11, 17), "Transporte");
        saveExpense(principal, "25.00", LocalDate.of(2026, 10, 5), "Casa");

        setAuthenticatedUser(principal);

        assertThat(service.listExpenses(new ListExpensesFilter(null, null, "Transporte", null)))
                .extracting(ListExpensesResponse::amount)
                .containsExactly(new BigDecimal("40.00"));

        assertThat(service.listExpenses(new ListExpensesFilter(
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), null, null))).hasSize(2);

        assertThat(service.listExpenses(new ListExpensesFilter(
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), "Casa", null)))
                .extracting(ListExpensesResponse::amount)
                .containsExactly(new BigDecimal("25.00"));

        assertThat(service.listExpenses(new ListExpensesFilter(null, null, null, null))).hasSize(3);
    }

    @SuppressWarnings("null")
@Test
    void dependentFiltersAreRestrictedToOwnExpenses() {
        User principal = createUser(Role.PRINCIPAL, "list-dependent-filter-owner@aurora.com", null);
        User dependent = createUser(Role.DEPENDENTE, "list-dependent-filter@aurora.com", principal.getFamilyGroup());
        saveExpense(principal, "150.00", LocalDate.of(2026, 11, 18), "Casa");
        saveExpense(dependent, "40.00", LocalDate.of(2026, 11, 17), "Transporte");

        setAuthenticatedUser(dependent);

        assertThat(service.listExpenses(new ListExpensesFilter(null, null, "Casa", null))).isEmpty();
        assertThat(service.listExpenses(new ListExpensesFilter(null, null, "Transporte", null)))
                .extracting(ListExpensesResponse::userId)
                .containsExactly(dependent.getId());
        assertThat(service.listExpenses(new ListExpensesFilter(null, null, null, null))).hasSize(1);
    }

    @Test
    void rejectsPeriodWithStartAfterEnd() {
        User principal = createUser(Role.PRINCIPAL, "list-invalid-period@aurora.com", null);
        setAuthenticatedUser(principal);

        assertThatThrownBy(() -> service.listExpenses(new ListExpensesFilter(
                LocalDate.of(2026, 11, 30), LocalDate.of(2026, 11, 1), null, null)))
                .isInstanceOf(ValidationException.class);
    }

    private void saveExpense(User user, String amount) {
        saveExpense(user, amount, LocalDate.now(), "Casa");
    }

    private void saveExpense(User user, String amount, LocalDate expenseDate, String category) {
        expenseRepository.save(Expense.builder()
                .familyGroup(user.getFamilyGroup())
                .user(user)
                .amount(new BigDecimal(amount))
                .expenseDate(expenseDate)
                .category(category)
                .paymentMethod(ExpensePaymentMethod.PIX)
                .build());
    }
}
