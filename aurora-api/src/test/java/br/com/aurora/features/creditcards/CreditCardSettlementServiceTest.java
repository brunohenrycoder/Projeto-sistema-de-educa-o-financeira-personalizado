package br.com.aurora.features.creditcards;

import br.com.aurora.features.creditcards.getcreditcardinvoice.GetCreditCardInvoiceService;
import br.com.aurora.features.creditcards.deactivatecreditcard.DeactivateCreditCardService;
import br.com.aurora.features.creditcards.listcreditcards.ListCreditCardsService;
import br.com.aurora.features.creditcards.registercreditcardpayment.RegisterCreditCardPaymentRequest;
import br.com.aurora.features.creditcards.registercreditcardpayment.RegisterCreditCardPaymentService;
import br.com.aurora.features.creditcards.registercreditcardrefund.RegisterCreditCardRefundRequest;
import br.com.aurora.features.creditcards.registercreditcardrefund.RegisterCreditCardRefundService;
import br.com.aurora.features.expenses.registerexpense.RegisterExpenseRequest;
import br.com.aurora.features.expenses.registerexpense.RegisterExpenseService;
import br.com.aurora.shared.domain.CreditCardCreditApplicationRepository;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.CreditCardInvoice;
import br.com.aurora.shared.domain.CreditCardInvoiceRepository;
import br.com.aurora.shared.domain.CreditCardInvoiceStatus;
import br.com.aurora.shared.domain.CreditCardLedger;
import br.com.aurora.shared.domain.CreditCardPaymentRepository;
import br.com.aurora.shared.domain.CreditCardRefundAllocationRepository;
import br.com.aurora.shared.domain.CreditCardRefundCreditRepository;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class CreditCardSettlementServiceTest extends CreditCardServiceTestSupport {

    @Autowired private RegisterExpenseService expenseService;
    @Autowired private RegisterCreditCardPaymentService paymentService;
    @Autowired private RegisterCreditCardRefundService refundService;
    @Autowired private GetCreditCardInvoiceService invoiceService;
    @Autowired private ListCreditCardsService listCardsService;
    @Autowired private DeactivateCreditCardService deactivateService;
    @Autowired private CreditCardLedger ledger;
    @Autowired private CreditCardInvoiceRepository invoiceRepository;
    @Autowired private CreditCardInstallmentRepository installmentRepository;
    @Autowired private CreditCardPaymentRepository paymentRepository;
    @Autowired private CreditCardRefundAllocationRepository refundAllocationRepository;
    @Autowired private CreditCardRefundCreditRepository refundCreditRepository;
    @Autowired private CreditCardCreditApplicationRepository creditApplicationRepository;

    @Test
    void partialAndFullPaymentsUpdateOnlyTheCurrentInvoiceObligations() {
        User principal = createUser(Role.PRINCIPAL, "settlement-principal@aurora.com", null);
        createCard(principal, new BigDecimal("500.00"), 28, 10);
        setAuthenticatedUser(principal);
        var expense = registerExpense(principal, LocalDate.now(), new BigDecimal("100.00"), 1);
        CreditCardInvoice invoice = installmentRepository.findByExpenseIdOrderByInstallmentNumber(expense.getId())
                .getFirst().getInvoice();

        var partial = paymentService.register(invoice.getId(), payment(new BigDecimal("25.00")));
        assertThat(partial.paidAmount()).isEqualByComparingTo("25.00");
        assertThat(partial.outstandingAmount()).isEqualByComparingTo("75.00");
        assertThat(partial.invoiceStatus().name()).isEqualTo("PARTIALLY_PAID");

        assertThatThrownBy(() -> paymentService.register(invoice.getId(), payment(new BigDecimal("75.01"))))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("não pode ultrapassar");
        assertThat(paymentRepository.findByInvoiceIdOrderByPaidAtAsc(invoice.getId())).hasSize(1);

        var finalPayment = paymentService.register(invoice.getId(), payment(new BigDecimal("75.00")));
        assertThat(finalPayment.outstandingAmount()).isEqualByComparingTo("0.00");
        assertThat(finalPayment.invoiceStatus().name()).isEqualTo("PAID");
        assertThat(invoiceService.get(invoice.getId()).payments()).hasSize(2);
        assertThat(installmentRepository.findByExpenseIdOrderByInstallmentNumber(expense.getId())
                .getFirst().getPaidAmount()).isEqualByComparingTo("100.00");
    }

    @Test
    void refundsReduceNearestUnbilledInstallmentsAndCannotExceedOriginalPurchase() {
        User principal = createUser(Role.PRINCIPAL, "refund-principal@aurora.com", null);
        createCard(principal, new BigDecimal("500.00"), 28, 10);
        setAuthenticatedUser(principal);
        var expense = registerExpense(principal, LocalDate.now(), new BigDecimal("10.01"), 3);

        var firstRefund = refundService.register(expense.getId(), refund(new BigDecimal("5.00")));
        assertThat(firstRefund.amountAppliedToFutureInstallments()).isEqualByComparingTo("5.00");
        assertThat(firstRefund.pendingCreditAmount()).isEqualByComparingTo("0.00");
        var installments = installmentRepository.findByExpenseIdOrderByInstallmentNumber(expense.getId());
        assertThat(installments.get(0).getRefundedAmount()).isEqualByComparingTo("3.33");
        assertThat(installments.get(1).getRefundedAmount()).isEqualByComparingTo("1.67");
        assertThat(refundAllocationRepository.count()).isEqualTo(2);

        refundService.register(expense.getId(), refund(new BigDecimal("5.01")));
        assertThatThrownBy(() -> refundService.register(expense.getId(), refund(new BigDecimal("0.01"))))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("não pode ultrapassar");
    }

    @Test
    void refundCreditWaitsForAnOpenInvoiceAndIsAppliedOnlyOnce() {
        User principal = createUser(Role.PRINCIPAL, "refund-credit-principal@aurora.com", null);
        var card = createCard(principal, new BigDecimal("500.00"), 15, 10);
        setAuthenticatedUser(principal);
        var oldExpense = registerExpense(principal, LocalDate.of(2026, 8, 1), new BigDecimal("20.00"), 1);

        var refund = refundService.register(oldExpense.getId(), refund(new BigDecimal("10.00")));
        assertThat(refund.amountAppliedToInvoices()).isEqualByComparingTo("0.00");
        assertThat(refund.pendingCreditAmount()).isEqualByComparingTo("10.00");
        assertThat(refundCreditRepository.sumPendingAmountByCardId(card.getId()))
                .isEqualByComparingTo("10.00");

        var newExpense = registerExpense(principal, LocalDate.now(), new BigDecimal("30.00"), 1);
        CreditCardInvoice openInvoice = installmentRepository
                .findByExpenseIdOrderByInstallmentNumber(newExpense.getId()).getFirst().getInvoice();
        assertThat(openInvoice.getCreditAmount()).isEqualByComparingTo("10.00");
        assertThat(openInvoice.getOutstandingAmount()).isEqualByComparingTo("20.00");
        assertThat(refundCreditRepository.sumPendingAmountByCardId(card.getId()))
                .isEqualByComparingTo("0.00");
        assertThat(creditApplicationRepository.findByInvoiceIdOrderByAppliedAtAsc(openInvoice.getId())).hasSize(1);
    }

    @Test
    void invoiceAndRefundOperationsAreIsolatedByFamily() {
        User owner = createUser(Role.PRINCIPAL, "settlement-owner@aurora.com", null);
        createCard(owner, new BigDecimal("500.00"), 28, 10);
        setAuthenticatedUser(owner);
        var expense = registerExpense(owner, LocalDate.now(), new BigDecimal("30.00"), 1);
        CreditCardInvoice invoice = installmentRepository.findByExpenseIdOrderByInstallmentNumber(expense.getId())
                .getFirst().getInvoice();

        User otherPrincipal = createUser(Role.PRINCIPAL, "settlement-other@aurora.com", null);
        setAuthenticatedUser(otherPrincipal);
        assertThatThrownBy(() -> paymentService.register(invoice.getId(), payment(new BigDecimal("1.00"))))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> refundService.register(expense.getId(), refund(new BigDecimal("1.00"))))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void overLimitPurchasesAreAllowedButSignaledAndDeactivationBlocksNewPurchases() {
        User principal = createUser(Role.PRINCIPAL, "over-limit-principal@aurora.com", null);
        var card = createCard(principal, new BigDecimal("20.00"), 28, 10);
        setAuthenticatedUser(principal);
        registerExpense(principal, LocalDate.now(), new BigDecimal("30.00"), 1);

        var cardSummary = listCardsService.list().cards().getFirst();
        assertThat(cardSummary.limitExceeded()).isTrue();
        assertThat(cardSummary.limitUsed()).isEqualByComparingTo("30.00");
        assertThat(cardSummary.limitAvailable()).isEqualByComparingTo("0.00");

        deactivateService.deactivate(card.getId());
        assertThatThrownBy(() -> registerExpense(
                principal, LocalDate.now(), new BigDecimal("1.00"), 1
        )).isInstanceOf(ValidationException.class).hasMessageContaining("cartão de crédito ativo");
    }

    @Test
    void scheduledRefreshClosesAndMarksUnpaidOverdueInvoices() {
        User principal = createUser(Role.PRINCIPAL, "invoice-schedule-principal@aurora.com", null);
        createCard(principal, new BigDecimal("500.00"), 28, 10);
        setAuthenticatedUser(principal);
        var expense = registerExpense(principal, LocalDate.now(), new BigDecimal("100.00"), 1);
        CreditCardInvoice invoice = installmentRepository.findByExpenseIdOrderByInstallmentNumber(expense.getId())
                .getFirst().getInvoice();

        invoice.setClosingDate(LocalDate.now().minusDays(2));
        invoice.setDueDate(LocalDate.now().plusDays(1));
        invoice.setStatus(CreditCardInvoiceStatus.OPEN);
        invoiceRepository.save(invoice);
        ledger.refreshDueInvoices();
        assertThat(invoiceRepository.findById(invoice.getId()).orElseThrow().getStatus())
                .isEqualTo(CreditCardInvoiceStatus.CLOSED);

        invoice.setClosingDate(LocalDate.now().minusDays(2));
        invoice.setDueDate(LocalDate.now().minusDays(1));
        invoiceRepository.save(invoice);
        ledger.refreshDueInvoices();
        assertThat(invoiceRepository.findById(invoice.getId()).orElseThrow().getStatus())
                .isEqualTo(CreditCardInvoiceStatus.OVERDUE);
    }

    private br.com.aurora.features.expenses.registerexpense.RegisterExpenseResponse registerExpense(
            User user,
            LocalDate date,
            BigDecimal amount,
            int installments
    ) {
        setAuthenticatedUser(user);
        return expenseService.registerExpense(RegisterExpenseRequest.builder()
                .amount(amount)
                .expenseDate(date)
                .category("Compras")
                .paymentMethod(ExpensePaymentMethod.CARTAO_CREDITO)
                .installmentCount(installments)
                .build());
    }

    private RegisterCreditCardPaymentRequest payment(BigDecimal amount) {
        return RegisterCreditCardPaymentRequest.builder().amount(amount).build();
    }

    private RegisterCreditCardRefundRequest refund(BigDecimal amount) {
        return RegisterCreditCardRefundRequest.builder().amount(amount).build();
    }
}
