package br.com.aurora.features.expenses.updateexpense;

import br.com.aurora.features.creditcards.CreditCardServiceTestSupport;
import br.com.aurora.features.expenses.deleteexpense.DeleteExpenseService;
import br.com.aurora.features.expenses.registerexpense.RegisterExpenseRequest;
import br.com.aurora.features.expenses.registerexpense.RegisterExpenseService;
import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.CreditCardInstallment;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.CreditCardInvoice;
import br.com.aurora.shared.domain.CreditCardInvoiceRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class UpdateExpenseServiceTest extends CreditCardServiceTestSupport {

    @Autowired private UpdateExpenseService service;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private RegisterExpenseService registerExpenseService;
    @Autowired private DeleteExpenseService deleteExpenseService;
    @Autowired private CreditCardInstallmentRepository installmentRepository;
    @Autowired private CreditCardInvoiceRepository invoiceRepository;

    @Test
    void dependentCanUpdateOwnExpenseWithoutReplacingOmittedFields() {
        User principal = createUser(Role.PRINCIPAL, "update-principal@aurora.com", null);
        User dependent = createUser(Role.DEPENDENTE, "update-dependent@aurora.com", principal.getFamilyGroup());
        Expense ownExpense = saveExpense(dependent);
        setAuthenticatedUser(dependent);

        UpdateExpenseResponse response = service.updateExpense(
                ownExpense.getId(),
                UpdateExpenseRequest.builder().amount(new BigDecimal("50.00")).build()
        );

        assertThat(response.amount()).isEqualByComparingTo("50.00");
        assertThat(response.category()).isEqualTo("Transporte");
    }

    @Test
    void dependentCannotUpdateAnotherMembersExpenseAndForeignFamilyIsNotFound() {
        User principal = createUser(Role.PRINCIPAL, "update-owner@aurora.com", null);
        User dependent = createUser(Role.DEPENDENTE, "update-actor@aurora.com", principal.getFamilyGroup());
        User other = createUser(Role.DEPENDENTE, "update-other@aurora.com", principal.getFamilyGroup());
        Expense otherExpense = saveExpense(other);
        setAuthenticatedUser(dependent);

        assertThatThrownBy(() -> service.updateExpense(
                otherExpense.getId(),
                UpdateExpenseRequest.builder().amount(new BigDecimal("50.00")).build()
        )).isInstanceOf(AccessDeniedException.class);

        User otherPrincipal = createUser(Role.PRINCIPAL, "update-foreign@aurora.com", null);
        Expense foreignExpense = saveExpense(otherPrincipal);
        setAuthenticatedUser(principal);
        assertThatThrownBy(() -> service.updateExpense(
                foreignExpense.getId(),
                UpdateExpenseRequest.builder().amount(new BigDecimal("50.00")).build()
        )).isInstanceOf(ResourceNotFoundException.class);
    }

    @SuppressWarnings("null")
    @Test
    void creditPurchaseCanBeEditedOnlyWhileItsInvoiceIsOpen() {
        User principal = createUser(Role.PRINCIPAL, "update-credit-principal@aurora.com", null);
        createCard(principal, new BigDecimal("500.00"), 28, 10);
        setAuthenticatedUser(principal);
        var openPurchase = registerCreditExpense(principal, LocalDate.now(), new BigDecimal("10.00"), 2);

        service.updateExpense(openPurchase.getId(), UpdateExpenseRequest.builder()
        .amount(new BigDecimal("12.00"))
        .build());

        List<CreditCardInstallment> activeInstallments = installmentRepository
        .findByExpenseIdOrderByInstallmentNumber(openPurchase.getId())
        .stream()
        .filter(installment -> !installment.isCancelled())
        .toList();
        assertThat(activeInstallments).hasSize(2);
        assertThat(activeInstallments).extracting(CreditCardInstallment::getAmount)
        .containsExactly(new BigDecimal("6.00"), new BigDecimal("6.00"));
        assertThat(invoiceRepository.findByFamilyGroupIdOrderByClosingDateDesc(
        principal.getFamilyGroup().getId()
        )).extracting(CreditCardInvoice::getTotalAmount)
        .containsExactly(new BigDecimal("6.00"), new BigDecimal("6.00"));

        var closedPurchase = registerCreditExpense(
        principal, LocalDate.of(2026, 8, 1), new BigDecimal("20.00"), 1
        );
        assertThatThrownBy(() -> service.updateExpense(closedPurchase.getId(), UpdateExpenseRequest.builder()
        .category("Outra categoria")
        .build())).isInstanceOf(ValidationException.class)
        .hasMessageContaining("não podem ser alteradas diretamente");
        assertThatThrownBy(() -> deleteExpenseService.deleteExpense(closedPurchase.getId()))
        .isInstanceOf(ValidationException.class)
        .hasMessageContaining("não podem ser alteradas diretamente");
    }

    @Test
    void deletingAnOpenCreditPurchaseCancelsItsInstallmentsWithoutDeletingHistory() {
        User principal = createUser(Role.PRINCIPAL, "delete-credit-principal@aurora.com", null);
        createCard(principal, new BigDecimal("500.00"), 28, 10);
        setAuthenticatedUser(principal);
        var purchase = registerCreditExpense(principal, LocalDate.now(), new BigDecimal("40.00"), 2);

        deleteExpenseService.deleteExpense(purchase.getId());

        assertThat(expenseRepository.findById(purchase.getId()).orElseThrow().getStatus())
        .isEqualTo(br.com.aurora.shared.domain.ExpenseStatus.CANCELADO);
        assertThat(installmentRepository.findByExpenseIdOrderByInstallmentNumber(purchase.getId()))
        .allSatisfy(installment -> assertThat(installment.isCancelled()).isTrue());
    }

    private br.com.aurora.features.expenses.registerexpense.RegisterExpenseResponse registerCreditExpense(
            User user,
            LocalDate date,
            BigDecimal amount,
            int count
    ) {
        setAuthenticatedUser(user);
        return registerExpenseService.registerExpense(RegisterExpenseRequest.builder()
        .amount(amount)
        .expenseDate(date)
        .category("Compras")
        .paymentMethod(ExpensePaymentMethod.CARTAO_CREDITO)
        .installmentCount(count)
        .build());
    }

    private Expense saveExpense(User user) {
        return expenseRepository.save(Expense.builder()
                .familyGroup(user.getFamilyGroup())
                .user(user)
                .amount(new BigDecimal("25.00"))
                .expenseDate(LocalDate.now())
                .category("Transporte")
                .paymentMethod(ExpensePaymentMethod.PIX)
                .build());
    }
}
