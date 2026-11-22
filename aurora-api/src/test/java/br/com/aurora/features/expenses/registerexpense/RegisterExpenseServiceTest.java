package br.com.aurora.features.expenses.registerexpense;

import br.com.aurora.features.creditcards.CreditCardServiceTestSupport;
import br.com.aurora.shared.domain.CreditCardInstallment;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.CreditCardInvoiceRepository;
import br.com.aurora.shared.domain.CreditCardLedger;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.error.ValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RegisterExpenseServiceTest extends CreditCardServiceTestSupport {

    @Autowired private RegisterExpenseService service;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private CreditCardInstallmentRepository installmentRepository;
    @Autowired private CreditCardInvoiceRepository invoiceRepository;
    @Autowired private CreditCardLedger creditCardLedger;
    @Autowired private MockMvc mockMvc;

    @Test
    void registersExpenseWithAuthenticatedUserAndPersistsIt() {
        User principal = createUser(Role.PRINCIPAL, "register-principal@aurora.com", null);
        setAuthenticatedUser(principal);

        RegisterExpenseResponse response = service.registerExpense(RegisterExpenseRequest.builder()
                .amount(new BigDecimal("125.50"))
                .expenseDate(LocalDate.now())
                .category("Alimentação")
                .paymentMethod(ExpensePaymentMethod.PIX)
                .build());

        assertThat(response.getUserId()).isEqualTo(principal.getId());
        assertThat(response.getFamilyGroupId()).isEqualTo(principal.getFamilyGroup().getId());
        assertThat(expenseRepository.findById(response.getId())).isPresent();
    }

    @Test
    void rejectsNonPositiveAmountAndCreditPurchaseWithoutActiveCard() {
        User principal = createUser(Role.PRINCIPAL, "register-invalid@aurora.com", null);
        setAuthenticatedUser(principal);
        RegisterExpenseRequest invalidAmount = request(BigDecimal.ZERO, ExpensePaymentMethod.PIX);
        RegisterExpenseRequest creditCard = request(new BigDecimal("45.00"), ExpensePaymentMethod.CARTAO_CREDITO);

        assertThatThrownBy(() -> service.registerExpense(invalidAmount))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("maior que zero");
        assertThatThrownBy(() -> service.registerExpense(creditCard))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("cartão de crédito ativo");
    }

    @Test
    void endpointRejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(post("/api/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": 12.50,
                                  "expenseDate": "2026-11-13",
                                  "category": "Compras",
                                  "paymentMethod": "PIX"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @SuppressWarnings("null")
@Test
    void registersInstallmentsAcrossCyclesAndAdjustsTheLastCent() {
        User principal = createUser(Role.PRINCIPAL, "register-installments@aurora.com", null);
        createCard(principal, new BigDecimal("50.00"), 15, 10);
        setAuthenticatedUser(principal);

        RegisterExpenseResponse response = service.registerExpense(RegisterExpenseRequest.builder()
                .amount(new BigDecimal("100.01"))
                .expenseDate(LocalDate.of(2026, 6, 15))
                .category("Compras")
                .paymentMethod(ExpensePaymentMethod.CARTAO_CREDITO)
                .installmentCount(3)
                .build());

        var installments = installmentRepository.findByExpenseIdOrderByInstallmentNumber(response.getId());
        assertThat(installments).hasSize(3);
        assertThat(installments.get(0).getAmount()).isEqualByComparingTo("33.33");
        assertThat(installments.get(1).getAmount()).isEqualByComparingTo("33.33");
        assertThat(installments.get(2).getAmount()).isEqualByComparingTo("33.35");
        assertThat(installments.stream().map(CreditCardInstallment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo("100.01");
        assertThat(installments.stream().map(item -> item.getInvoice().getClosingDate()).toList())
                .containsExactly(
                        LocalDate.of(2026, 6, 15),
                        LocalDate.of(2026, 7, 15),
                        LocalDate.of(2026, 8, 15)
                );
        assertThat(installments.get(0).getInvoice().getDueDate()).isEqualTo(LocalDate.of(2026, 7, 10));
        assertThat(creditCardLedger.getCommittedAmount(installments.getFirst().getInvoice().getCard().getId()))
                .isEqualByComparingTo("100.01");
    }

    @Test
    void closingDateBelongsToCurrentCycleAndTheFollowingDayBelongsToNextCycle() {
        User principal = createUser(Role.PRINCIPAL, "register-cycle-boundary@aurora.com", null);
        createCard(principal, new BigDecimal("1000.00"), 15, 10);
        setAuthenticatedUser(principal);

        RegisterExpenseResponse onClosingDay = registerCardExpense(
                LocalDate.of(2026, 6, 15), new BigDecimal("10.00"), null
        );
        RegisterExpenseResponse afterClosingDay = registerCardExpense(
                LocalDate.of(2026, 6, 16), new BigDecimal("20.00"), null
        );

        assertThat(installmentRepository.findByExpenseIdOrderByInstallmentNumber(onClosingDay.getId())
                .getFirst().getInvoice().getClosingDate()).isEqualTo(LocalDate.of(2026, 6, 15));
        assertThat(installmentRepository.findByExpenseIdOrderByInstallmentNumber(afterClosingDay.getId())
                .getFirst().getInvoice().getClosingDate()).isEqualTo(LocalDate.of(2026, 7, 15));
        assertThat(invoiceRepository.findByFamilyGroupIdOrderByClosingDateDesc(
                principal.getFamilyGroup().getId()
        )).hasSize(2);
    }

    @Test
    void dependentCanRegisterCreditWithoutProvidingCardOrInvoiceIdentifiers() {
        User principal = createUser(Role.PRINCIPAL, "register-dependent-owner@aurora.com", null);
        User dependent = createUser(Role.DEPENDENTE, "register-dependent-buyer@aurora.com", principal.getFamilyGroup());
        createCard(principal, new BigDecimal("300.00"), 28, 10);
        setAuthenticatedUser(dependent);

        RegisterExpenseResponse response = registerCardExpense(LocalDate.now(), new BigDecimal("40.00"), 2);

        assertThat(response.getUserId()).isEqualTo(dependent.getId());
        assertThat(response.getPaymentMethod()).isEqualTo(ExpensePaymentMethod.CARTAO_CREDITO);
        assertThat(installmentRepository.findByExpenseIdOrderByInstallmentNumber(response.getId())).hasSize(2);
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void rejectsCreditPurchaseWithoutActiveCardAndRollsBackTheExpense() {
        User principal = createUser(Role.PRINCIPAL, "register-no-card-" + java.util.UUID.randomUUID()
                + "@aurora.com", null);
        setAuthenticatedUser(principal);
        long countBefore = expenseRepository.count();

        try {
            assertThatThrownBy(() -> registerCardExpense(LocalDate.now(), new BigDecimal("40.00"), null))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("cartão de crédito ativo");
            assertThat(expenseRepository.count()).isEqualTo(countBefore);
        } finally {
            userRepository.delete(principal);
            familyGroupRepository.deleteById(principal.getFamilyGroup().getId());
        }
    }

    private RegisterExpenseResponse registerCardExpense(LocalDate date, BigDecimal amount, Integer count) {
        return service.registerExpense(RegisterExpenseRequest.builder()
                .amount(amount)
                .expenseDate(date)
                .category("Compras")
                .paymentMethod(ExpensePaymentMethod.CARTAO_CREDITO)
                .installmentCount(count)
                .build());
    }

    private RegisterExpenseRequest request(BigDecimal amount, ExpensePaymentMethod method) {
        return RegisterExpenseRequest.builder()
                .amount(amount)
                .expenseDate(LocalDate.now())
                .category("Compras")
                .paymentMethod(method)
                .build();
    }
}
