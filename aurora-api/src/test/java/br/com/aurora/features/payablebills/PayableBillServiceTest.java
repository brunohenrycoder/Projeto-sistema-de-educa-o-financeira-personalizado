package br.com.aurora.features.payablebills;

import br.com.aurora.features.creditcards.CreditCardServiceTestSupport;
import br.com.aurora.features.payablebills.cancelpayablebill.CancelPayableBillRequest;
import br.com.aurora.features.payablebills.cancelpayablebill.CancelPayableBillScope;
import br.com.aurora.features.payablebills.cancelpayablebill.CancelPayableBillService;
import br.com.aurora.features.payablebills.createpayablebill.CreatePayableBillRequest;
import br.com.aurora.features.payablebills.createpayablebill.CreatePayableBillResponse;
import br.com.aurora.features.payablebills.createpayablebill.CreatePayableBillService;
import br.com.aurora.features.payablebills.listpayablebillpayments.ListPayableBillPaymentsService;
import br.com.aurora.features.payablebills.listpayablebills.ListPayableBillsService;
import br.com.aurora.features.payablebills.registerpayablebillpayment.RegisterPayableBillPaymentRequest;
import br.com.aurora.features.payablebills.registerpayablebillpayment.RegisterPayableBillPaymentService;
import br.com.aurora.features.payablebills.updateoverduepayablebills.UpdateOverduePayableBillsService;
import br.com.aurora.features.payablebills.updatepayablebill.UpdatePayableBillRequest;
import br.com.aurora.features.payablebills.updatepayablebill.UpdatePayableBillService;
import br.com.aurora.features.payablebills.updaterecurrence.UpdatePayableBillRecurrenceRequest;
import br.com.aurora.features.payablebills.updaterecurrence.UpdatePayableBillRecurrenceService;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.PayableBill;
import br.com.aurora.shared.domain.PayableBillCategory;
import br.com.aurora.shared.domain.PayableBillPaymentRepository;
import br.com.aurora.shared.domain.PayableBillRecurrence;
import br.com.aurora.shared.domain.PayableBillRepository;
import br.com.aurora.shared.domain.PayableBillStatus;
import br.com.aurora.shared.domain.PayableBillStatusHistoryRepository;
import br.com.aurora.shared.domain.PayableBillSeriesRepository;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PayableBillServiceTest extends CreditCardServiceTestSupport {

    @Autowired private CreatePayableBillService createService;
    @Autowired private ListPayableBillsService listService;
    @Autowired private RegisterPayableBillPaymentService paymentService;
    @Autowired private ListPayableBillPaymentsService paymentHistoryService;
    @Autowired private CancelPayableBillService cancelService;
    @Autowired private UpdatePayableBillRecurrenceService recurrenceService;
    @Autowired private UpdatePayableBillService updateService;
    @Autowired private UpdateOverduePayableBillsService overdueService;
    @Autowired private PayableBillRepository billRepository;
    @Autowired private PayableBillSeriesRepository seriesRepository;
    @Autowired private PayableBillPaymentRepository paymentRepository;
    @Autowired private PayableBillStatusHistoryRepository statusHistoryRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private CreditCardInstallmentRepository installmentRepository;
    @Autowired private MockMvc mockMvc;
    @Autowired private TransactionTemplate transactionTemplate;

    @Test
    void createsAndPaysBillWithExactlyOneLinkedExpense() {
        User principal = createUser(Role.PRINCIPAL, "payable-paid-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var bill = create(PayableBillRecurrence.SEM_RECORRENCIA, LocalDate.now().plusDays(5));
        long expensesBefore = expenseRepository.count();

        var payment = paymentService.register(bill.id(), paymentRequest(ExpensePaymentMethod.PIX, null));

        assertThat(payment.status()).isEqualTo(PayableBillStatus.PAGA);
        assertThat(expenseRepository.findById(payment.expenseId())).isPresent();
        assertThat(paymentRepository.findByBillId(bill.id())).isPresent();
        assertThat(paymentHistoryService.list(bill.id()).payments()).hasSize(1);
        assertThat(statusHistoryRepository.findByBillIdOrderByChangedAtAsc(bill.id()))
                .extracting(history -> history.getStatus())
                .containsExactly(PayableBillStatus.PENDENTE, PayableBillStatus.PAGA);
        assertThatThrownBy(() -> paymentService.register(
                bill.id(), paymentRequest(ExpensePaymentMethod.PIX, null)))
                .isInstanceOf(ValidationException.class);
        assertThat(expenseRepository.count()).isEqualTo(expensesBefore + 1);
    }

    @Test
    void deniesDependentAndDoesNotExposeBillsAcrossFamilies() {
        User principal = createUser(Role.PRINCIPAL, "payable-owner-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var bill = create(PayableBillRecurrence.SEM_RECORRENCIA, LocalDate.now().plusDays(5));

        User dependent = createUser(
                Role.DEPENDENTE, "payable-dependent-" + UUID.randomUUID() + "@aurora.com", principal.getFamilyGroup());
        setAuthenticatedUser(dependent);
        assertThatThrownBy(() -> listService.list()).isInstanceOf(AccessDeniedException.class);

        User otherPrincipal = createUser(Role.PRINCIPAL, "payable-other-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(otherPrincipal);
        assertThat(listService.list().bills()).isEmpty();
        assertThatThrownBy(() -> paymentHistoryService.list(bill.id()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @WithMockUser(roles = "DEPENDENTE")
    void endpointRejectsDependent() throws Exception {
        mockMvc.perform(get("/api/payable-bills"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PRINCIPAL")
    void endpointRejectsCategoryOutsideTheControlledList() throws Exception {
        mockMvc.perform(post("/api/payable-bills")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "description": "Conta de teste",
                                  "amount": 20.00,
                                  "dueDate": "2027-01-10",
                                  "category": "CATEGORIA_INVALIDA",
                                  "recurrence": "SEM_RECORRENCIA"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void servicesRejectInvalidAmountsAndMissingPaymentMethod() {
        User principal = createUser(Role.PRINCIPAL, "payable-invalid-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        assertThatThrownBy(() -> createService.create(CreatePayableBillRequest.builder()
                .description("Conta inválida")
                .amount(BigDecimal.ZERO)
                .dueDate(LocalDate.now().plusDays(1))
                .category(PayableBillCategory.MORADIA)
                .recurrence(PayableBillRecurrence.SEM_RECORRENCIA)
                .build()))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("positivo");

        var bill = create(PayableBillRecurrence.SEM_RECORRENCIA, LocalDate.now().plusDays(1));
        assertThatThrownBy(() -> paymentService.register(bill.id(), RegisterPayableBillPaymentRequest.builder()
                .paymentDate(LocalDate.now())
                .build()))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("método de pagamento");
    }

    @SuppressWarnings("null")
@Test
    void createsNextMonthlyOccurrenceOnceAndRejectsPartialPayment() {
        User principal = createUser(Role.PRINCIPAL, "payable-monthly-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var bill = create(PayableBillRecurrence.MENSAL, LocalDate.of(2027, 1, 31));

        assertThatThrownBy(() -> paymentService.register(
                bill.id(), paymentRequest(ExpensePaymentMethod.PIX, new BigDecimal("19.99"))))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("integralmente");

        paymentService.register(bill.id(), paymentRequest(ExpensePaymentMethod.PIX, null));
        var occurrences = billRepository.findByFamilyGroupIdOrderByDueDateAsc(principal.getFamilyGroup().getId());
        assertThat(occurrences).hasSize(2);
        assertThat(occurrences.get(1).getDueDate()).isEqualTo(LocalDate.of(2027, 2, 28));
        assertThat(occurrences.get(1).getOccurrenceNumber()).isEqualTo(2);
        paymentService.register(occurrences.get(1).getId(), paymentRequest(ExpensePaymentMethod.PIX, null));
        assertThat(billRepository.findByFamilyGroupIdOrderByDueDateAsc(principal.getFamilyGroup().getId()))
                .extracting(PayableBill::getDueDate)
                .contains(LocalDate.of(2027, 3, 31));
        assertThatThrownBy(() -> paymentService.register(
                bill.id(), paymentRequest(ExpensePaymentMethod.PIX, null)))
                .isInstanceOf(ValidationException.class);
        assertThat(billRepository.findByFamilyGroupIdOrderByDueDateAsc(principal.getFamilyGroup().getId()))
                .hasSize(3);
    }

    @Test
    void updatesOnlyFutureUnpaidRecurrenceOccurrences() {
        User principal = createUser(Role.PRINCIPAL, "payable-series-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var bill = create(PayableBillRecurrence.MENSAL, LocalDate.now().plusMonths(1));
        paymentService.register(bill.id(), paymentRequest(ExpensePaymentMethod.PIX, null));
        PayableBill next = billRepository.findByFamilyGroupIdOrderByDueDateAsc(principal.getFamilyGroup().getId())
                .stream().filter(item -> item.getOccurrenceNumber() == 2).findFirst().orElseThrow();

        recurrenceService.update(bill.id(), UpdatePayableBillRecurrenceRequest.builder()
                .description("Aluguel atualizado")
                .amount(new BigDecimal("1250.00"))
                .category(PayableBillCategory.MORADIA)
                .nextDueDate(LocalDate.now().plusMonths(2))
                .build());

        PayableBill updatedNext = billRepository.findById(next.getId()).orElseThrow();
        PayableBill paidFirst = billRepository.findById(bill.id()).orElseThrow();
        assertThat(updatedNext.getDescription()).isEqualTo("Aluguel atualizado");
        assertThat(updatedNext.getAmount()).isEqualByComparingTo("1250.00");
        assertThat(updatedNext.getDueDate()).isEqualTo(LocalDate.now().plusMonths(2));
        assertThat(paidFirst.getDescription()).isEqualTo("Conta teste");
        assertThat(paidFirst.getStatus()).isEqualTo(PayableBillStatus.PAGA);
    }

    @Test
    void updatesOnlyAnUnpaidOccurrenceAndRejectsChangesToPaidBills() {
        User principal = createUser(Role.PRINCIPAL, "payable-update-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var bill = create(PayableBillRecurrence.SEM_RECORRENCIA, LocalDate.now().plusDays(5));

        var updated = updateService.update(bill.id(), UpdatePayableBillRequest.builder()
                .description("Conta atualizada")
                .amount(new BigDecimal("110.00"))
                .dueDate(LocalDate.now().plusDays(6))
                .category(PayableBillCategory.CONTAS_CONSUMO)
                .build());
        assertThat(updated.description()).isEqualTo("Conta atualizada");

        paymentService.register(bill.id(), paymentRequest(ExpensePaymentMethod.PIX, null));
        assertThatThrownBy(() -> updateService.update(bill.id(), UpdatePayableBillRequest.builder()
                .description("Não deve alterar")
                .amount(new BigDecimal("110.00"))
                .dueDate(LocalDate.now().plusDays(6))
                .category(PayableBillCategory.CONTAS_CONSUMO)
                .build()))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void cancellationStopsOnlySelectedOccurrenceOrTheUnpaidRemainderOfTheSeries() {
        User principal = createUser(Role.PRINCIPAL, "payable-cancel-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var bill = create(PayableBillRecurrence.MENSAL, LocalDate.now().plusDays(3));
        paymentService.register(bill.id(), paymentRequest(ExpensePaymentMethod.PIX, null));
        PayableBill next = billRepository.findByFamilyGroupIdOrderByDueDateAsc(principal.getFamilyGroup().getId())
                .stream().filter(item -> item.getOccurrenceNumber() == 2).findFirst().orElseThrow();

        var response = cancelService.cancel(next.getId(), CancelPayableBillRequest.builder()
                .scope(CancelPayableBillScope.OCORRENCIA_E_FUTURAS)
                .build());

        assertThat(response.status()).isEqualTo(PayableBillStatus.CANCELADA);
        assertThat(billRepository.findById(next.getId()).orElseThrow().getStatus())
                .isEqualTo(PayableBillStatus.CANCELADA);
        assertThat(billRepository.findById(bill.id()).orElseThrow().getStatus())
                .isEqualTo(PayableBillStatus.PAGA);
        assertThat(billRepository.findById(next.getId()).orElseThrow().getSeries().isActive()).isFalse();
    }

    @Test
    void marksOnlyPendingOverdueBillsAndRoutesCreditPaymentThroughCardLedger() {
        User principal = createUser(Role.PRINCIPAL, "payable-overdue-" + UUID.randomUUID() + "@aurora.com", null);
        createCard(principal, new BigDecimal("500.00"), 28, 10);
        setAuthenticatedUser(principal);
        var creditBill = create(PayableBillRecurrence.SEM_RECORRENCIA, LocalDate.now().plusDays(2));
        var creditPayment = paymentService.register(
                creditBill.id(), paymentRequest(ExpensePaymentMethod.CARTAO_CREDITO, null));
        var installments = installmentRepository.findByExpenseIdOrderByInstallmentNumber(creditPayment.expenseId());
        assertThat(installments).hasSize(1);
        LocalDate today = LocalDate.now();
        YearMonth expectedCycle = today.getDayOfMonth() > 28
                ? YearMonth.from(today).plusMonths(1)
                : YearMonth.from(today);
        assertThat(installments.getFirst().getInvoice().getClosingDate())
                .isEqualTo(expectedCycle.atDay(28));

        var overdueBill = create(PayableBillRecurrence.SEM_RECORRENCIA, LocalDate.now());
        var cancelledBill = create(PayableBillRecurrence.SEM_RECORRENCIA, LocalDate.now());
        cancelService.cancel(cancelledBill.id(), CancelPayableBillRequest.builder()
                .scope(CancelPayableBillScope.SOMENTE_OCORRENCIA)
                .build());
        PayableBill cancelled = billRepository.findById(cancelledBill.id()).orElseThrow();
        cancelled.setDueDate(LocalDate.now().minusDays(1));
        billRepository.save(cancelled);
        PayableBill billToAge = billRepository.findById(overdueBill.id()).orElseThrow();
        billToAge.setDueDate(LocalDate.now().minusDays(1));
        billRepository.save(billToAge);

        assertThat(listService.list().bills().stream()
                .filter(item -> item.id().equals(overdueBill.id()))
                .findFirst().orElseThrow().status())
                .isEqualTo(PayableBillStatus.ATRASADA);
        int changed = overdueService.markOverdue(LocalDate.now());

        assertThat(changed).isEqualTo(1);
        assertThat(billRepository.findById(overdueBill.id()).orElseThrow().getStatus())
                .isEqualTo(PayableBillStatus.ATRASADA);
        assertThat(billRepository.findById(creditBill.id()).orElseThrow().getStatus())
                .isEqualTo(PayableBillStatus.PAGA);
        assertThat(billRepository.findById(cancelledBill.id()).orElseThrow().getStatus())
                .isEqualTo(PayableBillStatus.CANCELADA);
        assertThat(creditPayment.expenseId()).isNotNull();
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void rollsBackBillPaymentAndExpenseWhenCreditCardIntegrationFails() {
        User principal = createUser(
                Role.PRINCIPAL, "payable-rollback-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var bill = create(PayableBillRecurrence.SEM_RECORRENCIA, LocalDate.now().plusDays(5));
        long expensesBefore = expenseRepository.count();
        try {
            assertThatThrownBy(() -> paymentService.register(
                    bill.id(), paymentRequest(ExpensePaymentMethod.CARTAO_CREDITO, null)))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("cartão de crédito ativo");

            assertThat(expenseRepository.count()).isEqualTo(expensesBefore);
            assertThat(paymentRepository.findByBillId(bill.id())).isEmpty();
            assertThat(billRepository.findById(bill.id()).orElseThrow().getStatus())
                    .isEqualTo(PayableBillStatus.PENDENTE);
        } finally {
            transactionTemplate.executeWithoutResult(transactionStatus -> {
                statusHistoryRepository.deleteAll(
                        statusHistoryRepository.findByBillIdOrderByChangedAtAsc(bill.id()));
                billRepository.deleteById(bill.id());
                seriesRepository.deleteById(bill.recurrenceSeriesId());
                userRepository.delete(principal);
                familyGroupRepository.deleteById(principal.getFamilyGroup().getId());
            });
        }
    }

    private CreatePayableBillResponse create(
            PayableBillRecurrence recurrence,
            LocalDate dueDate
    ) {
        return createService.create(CreatePayableBillRequest.builder()
                .description("Conta teste")
                .amount(new BigDecimal("100.00"))
                .dueDate(dueDate)
                .category(PayableBillCategory.MORADIA)
                .recurrence(recurrence)
                .build());
    }

    private RegisterPayableBillPaymentRequest paymentRequest(ExpensePaymentMethod method, BigDecimal amount) {
        return RegisterPayableBillPaymentRequest.builder()
                .paymentDate(LocalDate.now())
                .paymentMethod(method)
                .amount(amount)
                .build();
    }
}
