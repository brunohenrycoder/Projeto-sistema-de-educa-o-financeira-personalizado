package br.com.aurora.features.financialoverview;

import br.com.aurora.features.creditcards.CreditCardServiceTestSupport;
import br.com.aurora.features.creditcards.registercreditcardrefund.RegisterCreditCardRefundRequest;
import br.com.aurora.features.creditcards.registercreditcardrefund.RegisterCreditCardRefundService;
import br.com.aurora.features.expenses.registerexpense.RegisterExpenseRequest;
import br.com.aurora.features.expenses.registerexpense.RegisterExpenseService;
import br.com.aurora.features.notifications.checkfinancialoverviewalerts.CheckFinancialOverviewAlertsService;
import br.com.aurora.features.notifications.checkfinancialoverviewalerts.CheckFinancialOverviewAlertsScheduler;
import br.com.aurora.features.financialoverview.getmonthlyfinancialoverview.GetMonthlyFinancialOverviewService;
import br.com.aurora.features.payablebills.registerpayablebillpayment.RegisterPayableBillPaymentRequest;
import br.com.aurora.features.payablebills.registerpayablebillpayment.RegisterPayableBillPaymentService;
import br.com.aurora.shared.domain.CreditCardInstallment;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.CreditCardInvoice;
import br.com.aurora.shared.domain.CreditCardInvoiceRepository;
import br.com.aurora.shared.domain.CreditCardPayment;
import br.com.aurora.shared.domain.CreditCardPaymentRepository;
import br.com.aurora.shared.domain.CreditCardRefundRepository;
import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.ExpenseStatus;
import br.com.aurora.shared.domain.FinancialOverviewPolicy;
import br.com.aurora.shared.domain.Notification;
import br.com.aurora.shared.domain.NotificationRepository;
import br.com.aurora.shared.domain.NotificationType;
import br.com.aurora.shared.domain.PayableBill;
import br.com.aurora.shared.domain.PayableBillCategory;
import br.com.aurora.shared.domain.PayableBillPayment;
import br.com.aurora.shared.domain.PayableBillPaymentRepository;
import br.com.aurora.shared.domain.PayableBillRecurrence;
import br.com.aurora.shared.domain.PayableBillRepository;
import br.com.aurora.shared.domain.PayableBillSeries;
import br.com.aurora.shared.domain.PayableBillSeriesRepository;
import br.com.aurora.shared.domain.PayableBillStatus;
import br.com.aurora.shared.domain.Receivable;
import br.com.aurora.shared.domain.ReceivableConfirmation;
import br.com.aurora.shared.domain.ReceivableConfirmationRepository;
import br.com.aurora.shared.domain.ReceivableRecurrence;
import br.com.aurora.shared.domain.ReceivableRepository;
import br.com.aurora.shared.domain.ReceivableSeries;
import br.com.aurora.shared.domain.ReceivableSeriesRepository;
import br.com.aurora.shared.domain.ReceivableStatus;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.UsuarioAutenticado;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
class FinancialOverviewServiceTest extends CreditCardServiceTestSupport {

    private static final BigDecimal ALERT_THRESHOLD = FinancialOverviewPolicy.ALERT_THRESHOLD_PERCENT;

    @Autowired private GetMonthlyFinancialOverviewService overviewService;
    @Autowired private CheckFinancialOverviewAlertsService alertService;
    @Autowired private CheckFinancialOverviewAlertsScheduler alertScheduler;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private ReceivableSeriesRepository receivableSeriesRepository;
    @Autowired private ReceivableRepository receivableRepository;
    @Autowired private ReceivableConfirmationRepository confirmationRepository;
    @Autowired private PayableBillSeriesRepository payableBillSeriesRepository;
    @Autowired private PayableBillRepository payableBillRepository;
    @Autowired private PayableBillPaymentRepository payableBillPaymentRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private CreditCardInvoiceRepository invoiceRepository;
    @Autowired private CreditCardInstallmentRepository installmentRepository;
    @Autowired private CreditCardPaymentRepository cardPaymentRepository;
    @Autowired private CreditCardRefundRepository refundRepository;
    @Autowired private RegisterExpenseService registerExpenseService;
    @Autowired private RegisterPayableBillPaymentService registerPayableBillPaymentService;
    @Autowired private RegisterCreditCardRefundService refundService;
    @Autowired private MockMvc mockMvc;
    @Autowired private PlatformTransactionManager transactionManager;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @Transactional
    void monthlyOverviewSeparatesRealizedAndPlannedValuesWithoutDuplicatingPaidBills() {
        YearMonth month = YearMonth.of(2026, 10);
        User principal = createUser(Role.PRINCIPAL, "overview-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        User dependent = createUser(
                Role.DEPENDENTE,
                "overview-dependent-" + java.util.UUID.randomUUID() + "@aurora.com",
                principal.getFamilyGroup()
        );
        User otherPrincipal = createUser(
                Role.PRINCIPAL, "overview-other-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);

        addReceivable(principal, month.atDay(5), "200.00", ReceivableStatus.RECEBIDA, month.atDay(5));
        addReceivable(principal, month.atDay(25), "80.00", ReceivableStatus.PENDENTE, null);
        addReceivable(principal, month.atDay(15), "900.00", ReceivableStatus.CANCELADA, null);
        addExpense(principal, "100.00", month.atDay(4), ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(dependent, "40.00", month.atDay(6), ExpensePaymentMethod.DINHEIRO, ExpenseStatus.ATIVO);
        addExpense(principal, "900.00", month.atDay(7), ExpensePaymentMethod.PIX, ExpenseStatus.CANCELADO);
        addExpense(principal, "500.00", month.plusMonths(1).atDay(1),
                ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(otherPrincipal, "700.00", month.atDay(8), ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);

        PayableBill paidBill = addBill(principal, "50.00", month.atDay(1), PayableBillStatus.PAGA);
        Expense billExpense = addExpense(
                principal, "50.00", month.atDay(10), ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        payableBillPaymentRepository.save(PayableBillPayment.builder()
                .bill(paidBill)
                .expense(billExpense)
                .paidBy(principal)
                .amount(new BigDecimal("50.00"))
                .paymentDate(month.atDay(10))
                .paymentMethod(ExpensePaymentMethod.PIX)
                .build());
        addBill(principal, "30.00", month.atDay(20), PayableBillStatus.PENDENTE);
        addBill(principal, "900.00", month.atDay(21), PayableBillStatus.CANCELADA);

        var result = overviewService.get(month.toString());

        assertThat(result.realizedIncome()).isEqualByComparingTo("200.00");
        assertThat(result.plannedIncome()).isEqualByComparingTo("80.00");
        assertThat(result.realizedExpenses()).isEqualByComparingTo("190.00");
        assertThat(result.plannedExpenses()).isEqualByComparingTo("30.00");
        assertThat(result.projectedBalance()).isEqualByComparingTo("60.00");
        assertThat(result.incomeConsidered()).isEqualByComparingTo("280.00");
        assertThat(result.expensesConsidered()).isEqualByComparingTo("220.00");
        assertThat(result.commitmentPercent()).isEqualByComparingTo("78.57");
        assertThat(result.thresholdReached()).isFalse();
    }

    @Test
    @Transactional
    void cardInstallmentsBelongToTheirInvoiceMonthAndPaymentsAreCashOutflowsOnlyOnce() {
        YearMonth month = YearMonth.of(2026, 11);
        User principal = createUser(Role.PRINCIPAL, "overview-card-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        createCard(principal, new BigDecimal("1000.00"), 28, 10);
        setAuthenticatedUser(principal);
        var expenseResponse = registerExpenseService.registerExpense(RegisterExpenseRequest.builder()
                .amount(new BigDecimal("120.00"))
                .expenseDate(LocalDate.of(2026, 10, 3))
                .category("Compras")
                .paymentMethod(ExpensePaymentMethod.CARTAO_CREDITO)
                .installmentCount(3)
                .build());
        CreditCardInstallment installment = installmentRepository
                .findByExpenseIdOrderByInstallmentNumber(expenseResponse.getId()).getFirst();
        CreditCardInvoice invoice = installment.getInvoice();
        invoice.setDueDate(month.atDay(10));
        invoice.setTotalAmount(new BigDecimal("40.00"));
        invoice.setPaidAmount(new BigDecimal("10.00"));
        invoiceRepository.save(invoice);
        installment.setPaidAmount(new BigDecimal("10.00"));
        installmentRepository.save(installment);
        cardPaymentRepository.save(CreditCardPayment.builder()
                .invoice(invoice)
                .user(principal)
                .amount(new BigDecimal("10.00"))
                .paidAt(month.atDay(5).atTime(12, 0))
                .build());
        addReceivable(principal, month.atDay(2), "100.00", ReceivableStatus.RECEBIDA, month.atDay(2));

        var result = overviewService.get(month.toString());

        assertThat(result.realizedExpenses()).isEqualByComparingTo("10.00");
        assertThat(result.plannedExpenses()).isEqualByComparingTo("30.00");
        assertThat(result.expensesConsidered()).isEqualByComparingTo("40.00");
        assertThat(result.commitmentPercent()).isEqualByComparingTo("40.00");
    }

    @Test
    @Transactional
    void refundsReduceTheirRegistrationMonthAndDoNotRemainInFutureInstallments() {
        YearMonth refundMonth = YearMonth.of(2026, 11);
        User principal = createUser(Role.PRINCIPAL, "overview-refund-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        createCard(principal, new BigDecimal("1000.00"), 28, 10);
        setAuthenticatedUser(principal);
        var expense = registerExpenseService.registerExpense(RegisterExpenseRequest.builder()
                .amount(new BigDecimal("120.00"))
                .expenseDate(LocalDate.of(2026, 10, 3))
                .category("Compras")
                .paymentMethod(ExpensePaymentMethod.CARTAO_CREDITO)
                .installmentCount(2)
                .build());
        refundService.register(expense.getId(),
                RegisterCreditCardRefundRequest.builder().amount(new BigDecimal("60.00")).build());

        var refundMonthOverview = overviewService.get(refundMonth.toString());
        var futureMonthOverview = overviewService.get("2026-12");

        assertThat(refundMonthOverview.expensesConsidered()).isEqualByComparingTo("0.00");
        assertThat(refundMonthOverview.plannedExpenses()).isEqualByComparingTo("60.00");
        assertThat(futureMonthOverview.expensesConsidered()).isEqualByComparingTo("0.00");
        assertThat(futureMonthOverview.plannedExpenses()).isEqualByComparingTo("0.00");
        assertThat(refundRepository.findByExpenseIdInOrderByCreatedAtAsc(List.of(expense.getId()))).hasSize(1);
    }

    @Test
    @Transactional
    void billPaidByCreditCardIsConsumptionButNotAnImmediateCashOutflow() {
        YearMonth month = YearMonth.of(2026, 11);
        User principal = createUser(Role.PRINCIPAL, "overview-bill-card-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        createCard(principal, new BigDecimal("1000.00"), 28, 10);
        setAuthenticatedUser(principal);
        PayableBill bill = addBill(principal, "50.00", LocalDate.of(2026, 10, 1), PayableBillStatus.PENDENTE);

        registerPayableBillPaymentService.register(bill.getId(), RegisterPayableBillPaymentRequest.builder()
                .paymentDate(month.atDay(5))
                .paymentMethod(ExpensePaymentMethod.CARTAO_CREDITO)
                .build());

        var paymentMonthResult = overviewService.get(month.toString());
        var invoiceMonthResult = overviewService.get(month.plusMonths(1).toString());

        assertThat(paymentMonthResult.realizedExpenses()).isEqualByComparingTo("0.00");
        assertThat(paymentMonthResult.plannedExpenses()).isEqualByComparingTo("0.00");
        assertThat(invoiceMonthResult.realizedExpenses()).isEqualByComparingTo("0.00");
        assertThat(invoiceMonthResult.plannedExpenses()).isEqualByComparingTo("50.00");
        assertThat(invoiceMonthResult.expensesConsidered()).isEqualByComparingTo("50.00");
    }

    @Test
    @Transactional
    void principalCanReadOnlyOwnFamilyAndDependentAndAnonymousRequestsAreRejected() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "overview-access-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        User dependent = createUser(
                Role.DEPENDENTE,
                "overview-access-dependent-" + java.util.UUID.randomUUID() + "@aurora.com",
                principal.getFamilyGroup()
        );
        User otherPrincipal = createUser(
                Role.PRINCIPAL, "overview-access-other-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        addExpense(otherPrincipal, "1000.00", LocalDate.of(2026, 10, 1),
                ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);

        setAuthenticatedUser(principal);
        assertThat(overviewService.get("2026-10").expensesConsidered()).isEqualByComparingTo("0.00");

        UsuarioAutenticado authenticatedPrincipal = UsuarioAutenticado.fromUser(principal);
        SecurityContextHolder.clearContext();
        mockMvc.perform(get("/api/financial-overview")
                        .param("month", "2026-10")
                        .param("familyGroupId", otherPrincipal.getFamilyGroup().getId().toString())
                        .with(authentication(new UsernamePasswordAuthenticationToken(
                                authenticatedPrincipal, null, authenticatedPrincipal.getAuthorities()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.period").value("2026-10"))
                .andExpect(jsonPath("$.expensesConsidered").value(0.0));

        setAuthenticatedUser(dependent);
        assertThatThrownBy(() -> overviewService.get("2026-10")).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> overviewService.get("not-a-month")).isInstanceOf(AccessDeniedException.class);

        SecurityContextHolder.clearContext();
        mockMvc.perform(get("/api/financial-overview"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/financial-overview").with(user("dependent").roles("DEPENDENTE")))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void validatesMonthAndDoesNotCreateAlertsFromGet() {
        YearMonth month = YearMonth.of(2026, 10);
        User principal = createUser(Role.PRINCIPAL, "overview-month-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        addReceivable(principal, month.atDay(1), "100.00", ReceivableStatus.RECEBIDA, month.atDay(1));
        addExpense(principal, "80.00", month.atDay(2), ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);

        assertThatThrownBy(() -> overviewService.get("2026-13")).isInstanceOf(ValidationException.class);
        var result = overviewService.get(month.toString());
        assertThat(result.thresholdReached()).isTrue();
        assertThat(result.alert()).isNull();
        assertThat(notificationRepository.countByFamilyGroupIdAndTypeAndReferenceMonthAndThresholdPercent(
                principal.getFamilyGroup().getId(), NotificationType.ALERTA_DESPESAS,
                month.atDay(1), ALERT_THRESHOLD)).isZero();
        assertThat(overviewService.get(null).period()).isEqualTo(YearMonth.now());
    }

    @Test
    @Transactional
    void scheduledAlertIsIdempotentAtThresholdAndSkipsZeroIncome() {
        YearMonth month = YearMonth.of(2026, 10);
        User principal = createUser(Role.PRINCIPAL, "overview-alert-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        addReceivable(principal, month.atDay(1), "100.00", ReceivableStatus.RECEBIDA, month.atDay(1));
        addExpense(principal, "80.00", month.atDay(2), ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);

        alertService.checkFamily(principal.getFamilyGroup().getId(), month);
        addExpense(principal, "10.00", month.atDay(3), ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        alertService.checkFamily(principal.getFamilyGroup().getId(), month);

        assertThat(notificationRepository.countByFamilyGroupIdAndTypeAndReferenceMonthAndThresholdPercent(
                principal.getFamilyGroup().getId(), NotificationType.ALERTA_DESPESAS,
                month.atDay(1), ALERT_THRESHOLD)).isEqualTo(1);
        Notification savedAlert = notificationRepository
                .findByFamilyGroupIdAndTypeAndReferenceMonthAndThresholdPercent(
                        principal.getFamilyGroup().getId(), NotificationType.ALERTA_DESPESAS,
                        month.atDay(1), ALERT_THRESHOLD)
                .orElseThrow();
        assertThat(savedAlert.getCommitmentPercent()).isEqualByComparingTo("80.00");
        setAuthenticatedUser(principal);
        assertThat(overviewService.get(month.toString()).alert().id()).isEqualTo(savedAlert.getId());

        User noIncomePrincipal = createUser(
                Role.PRINCIPAL, "overview-zero-income-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        addExpense(noIncomePrincipal, "100.00", month.atDay(4), ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        alertService.checkFamily(noIncomePrincipal.getFamilyGroup().getId(), month);
        assertThat(notificationRepository.countByFamilyGroupIdAndTypeAndReferenceMonthAndThresholdPercent(
                noIncomePrincipal.getFamilyGroup().getId(), NotificationType.ALERTA_DESPESAS,
                month.atDay(1), ALERT_THRESHOLD)).isZero();
    }

    @Test
    @Transactional
    void dailySchedulerChecksCurrentMonthForActivePrincipals() {
        YearMonth month = YearMonth.now();
        User principal = createUser(
                Role.PRINCIPAL, "overview-scheduler-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        addReceivable(principal, month.atDay(1), "100.00", ReceivableStatus.RECEBIDA, month.atDay(1));
        addExpense(principal, "80.00", month.atDay(2), ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);

        alertScheduler.checkCurrentMonth();

        assertThat(notificationRepository.countByFamilyGroupIdAndTypeAndReferenceMonthAndThresholdPercent(
                principal.getFamilyGroup().getId(), NotificationType.ALERTA_DESPESAS,
                month.atDay(1), ALERT_THRESHOLD)).isEqualTo(1);
    }

    @Test
    void concurrentAlertChecksCreateOneAlertAndNextMonthCanCreateAnother() throws Exception {
        YearMonth month = YearMonth.of(2026, 10);
        User principal = createUser(Role.PRINCIPAL, "overview-race-" + java.util.UUID.randomUUID() + "@aurora.com", null);
        addReceivable(principal, month.atDay(1), "100.00", ReceivableStatus.RECEBIDA, month.atDay(1));
        addExpense(principal, "80.00", month.atDay(2), ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        int threadCount = 6;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> checks = new ArrayList<>();
        try {
            for (int i = 0; i < threadCount; i++) {
                checks.add(executor.submit(() -> {
                    ready.countDown();
                    start.await();
                    transactionTemplate.executeWithoutResult(
                            transaction -> alertService.checkFamily(principal.getFamilyGroup().getId(), month));
                    return null;
                }));
            }
            ready.await();
            start.countDown();
            for (Future<?> check : checks) {
                check.get();
            }
        } finally {
            executor.shutdownNow();
        }

        assertThat(notificationRepository.countByFamilyGroupIdAndTypeAndReferenceMonthAndThresholdPercent(
                principal.getFamilyGroup().getId(), NotificationType.ALERTA_DESPESAS,
                month.atDay(1), ALERT_THRESHOLD)).isEqualTo(1);
        YearMonth nextMonth = month.plusMonths(1);
        addReceivable(principal, nextMonth.atDay(1), "100.00", ReceivableStatus.RECEBIDA, nextMonth.atDay(1));
        addExpense(principal, "80.00", nextMonth.atDay(2), ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        alertService.checkFamily(principal.getFamilyGroup().getId(), nextMonth);
        assertThat(notificationRepository.countByFamilyGroupIdAndTypeAndReferenceMonthAndThresholdPercent(
                principal.getFamilyGroup().getId(), NotificationType.ALERTA_DESPESAS,
                nextMonth.atDay(1), ALERT_THRESHOLD)).isEqualTo(1);
    }

    private Receivable addReceivable(
            User principal,
            LocalDate expectedDate,
            String amount,
            ReceivableStatus status,
            LocalDate receivedDate
    ) {
        BigDecimal value = new BigDecimal(amount);
        ReceivableSeries series = receivableSeriesRepository.save(ReceivableSeries.builder()
                .familyGroup(principal.getFamilyGroup())
                .createdBy(principal)
                .description("Renda de teste")
                .expectedAmount(value)
                .recurrence(ReceivableRecurrence.SEM_RECORRENCIA)
                .nextExpectedDate(expectedDate)
                .nextOccurrenceNumber(2)
                .recurrenceDay(expectedDate.getDayOfMonth())
                .active(false)
                .build());
        Receivable receivable = receivableRepository.save(Receivable.builder()
                .familyGroup(principal.getFamilyGroup())
                .series(series)
                .createdBy(principal)
                .occurrenceNumber(1)
                .description("Renda de teste")
                .expectedAmount(value)
                .expectedDate(expectedDate)
                .recurrence(ReceivableRecurrence.SEM_RECORRENCIA)
                .status(status)
                .build());
        if (status == ReceivableStatus.RECEBIDA) {
            confirmationRepository.save(ReceivableConfirmation.builder()
                    .receivable(receivable)
                    .receivedBy(principal)
                    .amount(value)
                    .receivedDate(receivedDate)
                    .build());
        }
        return receivable;
    }

    private Expense addExpense(
            User user,
            String amount,
            LocalDate date,
            ExpensePaymentMethod paymentMethod,
            ExpenseStatus status
    ) {
        Expense.ExpenseBuilder builder = Expense.builder()
                .familyGroup(user.getFamilyGroup())
                .user(user)
                .amount(new BigDecimal(amount))
                .expenseDate(date)
                .category("OUTROS")
                .paymentMethod(paymentMethod)
                .status(status);
        if (status == ExpenseStatus.CANCELADO) {
            builder.cancelledBy(user).cancelledAt(java.time.LocalDateTime.now());
        }
        return expenseRepository.save(builder.build());
    }

    private PayableBill addBill(User principal, String amount, LocalDate dueDate, PayableBillStatus status) {
        BigDecimal value = new BigDecimal(amount);
        PayableBillSeries series = payableBillSeriesRepository.save(PayableBillSeries.builder()
                .familyGroup(principal.getFamilyGroup())
                .createdBy(principal)
                .description("Conta de teste")
                .amount(value)
                .category(PayableBillCategory.OUTROS)
                .recurrence(PayableBillRecurrence.SEM_RECORRENCIA)
                .nextDueDate(dueDate)
                .nextOccurrenceNumber(2)
                .recurrenceDay(dueDate.getDayOfMonth())
                .active(false)
                .build());
        return payableBillRepository.save(PayableBill.builder()
                .familyGroup(principal.getFamilyGroup())
                .series(series)
                .createdBy(principal)
                .occurrenceNumber(1)
                .description("Conta de teste")
                .amount(value)
                .dueDate(dueDate)
                .category(PayableBillCategory.OUTROS)
                .recurrence(PayableBillRecurrence.SEM_RECORRENCIA)
                .status(status)
                .build());
    }
}
