package br.com.aurora.features.financialgoals;

import br.com.aurora.features.creditcards.CreditCardServiceTestSupport;
import br.com.aurora.features.financialgoals.createfinancialgoal.CreateFinancialGoalRequest;
import br.com.aurora.features.financialgoals.createfinancialgoal.CreateFinancialGoalService;
import br.com.aurora.features.financialgoals.getsavingssuggestion.GetSavingsSuggestionService;
import br.com.aurora.features.financialgoals.listfinancialgoals.ListFinancialGoalsService;
import br.com.aurora.shared.domain.CreditCard;
import br.com.aurora.shared.domain.CreditCardInstallment;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.CreditCardInvoice;
import br.com.aurora.shared.domain.CreditCardInvoiceRepository;
import br.com.aurora.shared.domain.CreditCardInvoiceStatus;
import br.com.aurora.shared.domain.CreditCardPayment;
import br.com.aurora.shared.domain.CreditCardPaymentRepository;
import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.ExpenseStatus;
import br.com.aurora.shared.domain.FinancialGoalRepository;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FinancialGoalsEndpointTest extends CreditCardServiceTestSupport {

    private static final String GOALS = "/api/financial-goals";
    private static final String SUGGESTION = GOALS + "/savings-suggestion";
    private static final String CONFIRM = GOALS + "/confirm";

    @Autowired private MockMvc mockMvc;
    @Autowired private FinancialGoalRepository financialGoalRepository;
    @Autowired private ReceivableSeriesRepository receivableSeriesRepository;
    @Autowired private ReceivableRepository receivableRepository;
    @Autowired private ReceivableConfirmationRepository confirmationRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private CreditCardInvoiceRepository invoiceRepository;
    @Autowired private CreditCardInstallmentRepository installmentRepository;
    @Autowired private CreditCardPaymentRepository paymentRepository;
    @Autowired private GetSavingsSuggestionService suggestionService;
    @Autowired private CreateFinancialGoalService createService;
    @Autowired private ListFinancialGoalsService listService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void suggestionUsesRealizedCashFlowForExactlyThreePreviousMonths() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "goals-cashflow-owner@aurora.com", null);
        User otherPrincipal = createUser(Role.PRINCIPAL, "goals-cashflow-other@aurora.com", null);
        YearMonth currentMonth = YearMonth.now();
        YearMonth oldestMonth = currentMonth.minusMonths(3);
        YearMonth middleMonth = currentMonth.minusMonths(2);
        YearMonth latestMonth = currentMonth.minusMonths(1);

        addReceivable(principal, oldestMonth, "200.00", ReceivableStatus.RECEBIDA);
        addReceivable(principal, middleMonth, "900.00", ReceivableStatus.PENDENTE);
        addReceivable(principal, latestMonth, "100.00", ReceivableStatus.RECEBIDA);
        addReceivable(principal, currentMonth, "900.00", ReceivableStatus.RECEBIDA);
        addReceivable(otherPrincipal, oldestMonth, "900.00", ReceivableStatus.RECEBIDA);

        addExpense(principal, oldestMonth, "40.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, oldestMonth, "500.00", ExpensePaymentMethod.PIX, ExpenseStatus.CANCELADO);
        addExpense(principal, latestMonth, "20.00", ExpensePaymentMethod.DINHEIRO, ExpenseStatus.ATIVO);
        addExpense(principal, currentMonth, "900.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(otherPrincipal, oldestMonth, "900.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);

        CreditCard card = createCard(principal, new BigDecimal("2000.00"), 20, 10);
        Expense cardPurchase = addExpense(
                principal, oldestMonth, "100.00", ExpensePaymentMethod.CARTAO_CREDITO, ExpenseStatus.ATIVO);
        addCardInvoice(card, principal, oldestMonth, cardPurchase, "100.00", "30.00", true);
        Expense pendingCardPurchase = addExpense(
                principal, middleMonth, "100.00", ExpensePaymentMethod.CARTAO_CREDITO, ExpenseStatus.ATIVO);
        addCardInvoice(card, principal, middleMonth, pendingCardPurchase, "100.00", "0.00", false);

        mockMvc.perform(get(SUGGESTION).with(user(UsuarioAutenticado.fromUser(principal))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageMonthlySurplus").value(70.0));
        assertThat(financialGoalRepository.count()).isZero();
    }

    @Test
    void nonPositiveAverageDoesNotReturnASuggestion() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "goals-no-surplus@aurora.com", null);
        addExpense(principal, YearMonth.now().minusMonths(3), "90.00",
                ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);

        mockMvc.perform(get(SUGGESTION).with(user(UsuarioAutenticado.fromUser(principal))))
                .andExpect(status().isNoContent());
    }

    @Test
    void onlyPrincipalCanAccessGoalsAndGoalServicesAlsoEnforceAuthorization() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "goals-auth-owner@aurora.com", null);
        User dependent = createUser(Role.DEPENDENTE, "goals-auth-dependent@aurora.com",
                principal.getFamilyGroup());
        var principalAuthentication = user(UsuarioAutenticado.fromUser(principal));
        var dependentAuthentication = user(UsuarioAutenticado.fromUser(dependent));

        mockMvc.perform(get(GOALS).with(principalAuthentication)).andExpect(status().isOk());
        mockMvc.perform(get(SUGGESTION).with(principalAuthentication)).andExpect(status().isNoContent());
        mockMvc.perform(get(GOALS).with(dependentAuthentication)).andExpect(status().isForbidden());
        mockMvc.perform(get(SUGGESTION).with(dependentAuthentication)).andExpect(status().isForbidden());
        mockMvc.perform(post(CONFIRM).contentType("application/json")
                        .content("{\"targetAmount\":100.00}").with(dependentAuthentication))
                .andExpect(status().isForbidden());
        mockMvc.perform(get(GOALS)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(SUGGESTION)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(CONFIRM).contentType("application/json")
                        .content("{\"targetAmount\":100.00}"))
                .andExpect(status().isUnauthorized());

        setAuthenticatedUser(dependent);
        var request = new CreateFinancialGoalRequest(new BigDecimal("100.00"));
        assertThatThrownBy(() -> createService.confirm(request)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> listService.list()).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> suggestionService.get()).isInstanceOf(AccessDeniedException.class);
        assertThat(financialGoalRepository.count()).isZero();
    }

    @Test
    void explicitConfirmationCreatesGoalWithPrincipalSuppliedValueAndIsFamilyScoped() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "goals-create-owner@aurora.com", null);
        User otherPrincipal = createUser(Role.PRINCIPAL, "goals-create-other@aurora.com", null);

        mockMvc.perform(get(SUGGESTION).with(user(UsuarioAutenticado.fromUser(principal))))
                .andExpect(status().isNoContent());
        assertThat(financialGoalRepository.count()).isZero();

        mockMvc.perform(post(CONFIRM).contentType("application/json")
                        .content("{\"targetAmount\":456.78}")
                        .with(user(UsuarioAutenticado.fromUser(principal))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.targetAmount").value(456.78));

        mockMvc.perform(get(GOALS).with(user(UsuarioAutenticado.fromUser(principal))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].targetAmount").value(456.78))
                .andExpect(jsonPath("$[0].id").isNotEmpty());
        mockMvc.perform(get(GOALS).with(user(UsuarioAutenticado.fromUser(otherPrincipal))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        assertThat(financialGoalRepository.findAll()).singleElement().satisfies(goal -> {
            assertThat(goal.getCreatedBy().getId()).isEqualTo(principal.getId());
            assertThat(goal.getFamilyGroup().getId()).isEqualTo(principal.getFamilyGroup().getId());
            assertThat(goal.getTargetAmount()).isEqualByComparingTo("456.78");
        });
    }

    @Test
    void confirmedGoalTargetMustBePositiveAndHaveAtMostTwoDecimalPlaces() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "goals-validation@aurora.com", null);
        var authentication = user(UsuarioAutenticado.fromUser(principal));

        for (String amount : new String[]{"0", "-1.00", "1.001", "12345678901.00"}) {
            mockMvc.perform(post(CONFIRM).contentType("application/json")
                            .content("{\"targetAmount\":" + amount + "}").with(authentication))
                    .andExpect(status().isBadRequest());
        }
        assertThat(financialGoalRepository.count()).isZero();

        setAuthenticatedUser(principal);
        assertThatThrownBy(() -> createService.confirm(new CreateFinancialGoalRequest(new BigDecimal("1.001"))))
                .isInstanceOf(ValidationException.class);
        assertThat(financialGoalRepository.count()).isZero();
    }

    private void addReceivable(User user, YearMonth month, String amount, ReceivableStatus status) {
        BigDecimal value = new BigDecimal(amount);
        LocalDate date = month.atDay(5);
        ReceivableSeries series = receivableSeriesRepository.save(ReceivableSeries.builder()
                .familyGroup(user.getFamilyGroup())
                .createdBy(user)
                .description("Renda de teste")
                .expectedAmount(value)
                .recurrence(ReceivableRecurrence.SEM_RECORRENCIA)
                .nextExpectedDate(date)
                .nextOccurrenceNumber(2)
                .recurrenceDay(date.getDayOfMonth())
                .active(false)
                .build());
        Receivable receivable = receivableRepository.save(Receivable.builder()
                .familyGroup(user.getFamilyGroup())
                .series(series)
                .createdBy(user)
                .occurrenceNumber(1)
                .description("Renda de teste")
                .expectedAmount(value)
                .expectedDate(date)
                .recurrence(ReceivableRecurrence.SEM_RECORRENCIA)
                .status(status)
                .build());
        if (status == ReceivableStatus.RECEBIDA) {
            confirmationRepository.save(ReceivableConfirmation.builder()
                    .receivable(receivable)
                    .receivedBy(user)
                    .amount(value)
                    .receivedDate(date)
                    .build());
        }
    }

    private Expense addExpense(
            User user,
            YearMonth month,
            String amount,
            ExpensePaymentMethod paymentMethod,
            ExpenseStatus status
    ) {
        Expense.ExpenseBuilder expense = Expense.builder()
                .familyGroup(user.getFamilyGroup())
                .user(user)
                .amount(new BigDecimal(amount))
                .expenseDate(month.atDay(7))
                .category("Teste")
                .paymentMethod(paymentMethod)
                .status(status);
        if (status == ExpenseStatus.CANCELADO) {
            expense.cancelledBy(user).cancelledAt(LocalDateTime.now());
        }
        return expenseRepository.save(expense.build());
    }

    private void addCardInvoice(
            CreditCard card,
            User principal,
            YearMonth month,
            Expense purchase,
            String installmentAmount,
            String paidAmount,
            boolean paid
    ) {
        BigDecimal total = new BigDecimal(installmentAmount);
        BigDecimal paidValue = new BigDecimal(paidAmount);
        CreditCardInvoice invoice = invoiceRepository.save(CreditCardInvoice.builder()
                .card(card)
                .familyGroup(principal.getFamilyGroup())
                .cycleStart(month.atDay(1))
                .closingDate(month.atDay(5))
                .dueDate(month.atDay(15))
                .status(paidValue.compareTo(total) == 0
                        ? CreditCardInvoiceStatus.PAID
                        : paidValue.signum() > 0
                                ? CreditCardInvoiceStatus.PARTIALLY_PAID
                                : CreditCardInvoiceStatus.OPEN)
                .totalAmount(total)
                .paidAmount(paidValue)
                .creditAmount(BigDecimal.ZERO.setScale(2))
                .build());
        installmentRepository.save(CreditCardInstallment.builder()
                .invoice(invoice)
                .expense(purchase)
                .installmentNumber(1)
                .installmentCount(1)
                .amount(total)
                .paidAmount(paidValue)
                .refundedAmount(BigDecimal.ZERO.setScale(2))
                .creditedAmount(BigDecimal.ZERO.setScale(2))
                .cancelled(false)
                .build());
        if (paid) {
            paymentRepository.save(CreditCardPayment.builder()
                    .invoice(invoice)
                    .user(principal)
                    .amount(paidValue)
                    .paidAt(LocalDateTime.of(month.getYear(), month.getMonthValue(), 15, 12, 0))
                    .build());
        }
    }
}
