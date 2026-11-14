package br.com.aurora.features.creditcards.createcreditcard;

import br.com.aurora.features.creditcards.CreditCardServiceTestSupport;
import br.com.aurora.features.creditcards.deactivatecreditcard.DeactivateCreditCardService;
import br.com.aurora.features.creditcards.listcreditcards.ListCreditCardsService;
import br.com.aurora.features.creditcards.updatecreditcard.UpdateCreditCardRequest;
import br.com.aurora.features.creditcards.updatecreditcard.UpdateCreditCardService;
import br.com.aurora.features.expenses.registerexpense.RegisterExpenseRequest;
import br.com.aurora.features.expenses.registerexpense.RegisterExpenseService;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.CreditCardInvoiceRepository;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CreateCreditCardServiceTest extends CreditCardServiceTestSupport {

    @Autowired private CreateCreditCardService createService;
    @Autowired private DeactivateCreditCardService deactivateService;
    @Autowired private ListCreditCardsService listService;
    @Autowired private UpdateCreditCardService updateService;
    @Autowired private RegisterExpenseService expenseService;
    @Autowired private CreditCardInstallmentRepository installmentRepository;
    @Autowired private CreditCardInvoiceRepository invoiceRepository;
    @Autowired private MockMvc mockMvc;

    @Test
    void principalCanCreateOneActiveCardAndDependentCannotCreateAnother() {
        User principal = createUser(Role.PRINCIPAL, "card-principal@aurora.com", null);
        setAuthenticatedUser(principal);

        CreateCreditCardResponse response = createService.create(request(
                "VISA", null, new BigDecimal("500.00")
        ));

        assertThat(response.active()).isTrue();
        assertThat(response.limitAvailable()).isEqualByComparingTo("500.00");
        assertThatThrownBy(() -> createService.create(request(
                "VISA", null, new BigDecimal("700.00")
        ))).isInstanceOf(ValidationException.class).hasMessageContaining("já possui");

        User dependent = createUser(Role.DEPENDENTE, "card-dependent@aurora.com", principal.getFamilyGroup());
        setAuthenticatedUser(dependent);
        assertThatThrownBy(() -> createService.create(request(
                "VISA", null, new BigDecimal("500.00")
        ))).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void cardsAreFamilyIsolatedAndDeactivationPreservesHistory() {
        User principal = createUser(Role.PRINCIPAL, "card-owner@aurora.com", null);
        setAuthenticatedUser(principal);
        CreateCreditCardResponse created = createService.create(request(
                "OUTRA", "Cartão local", new BigDecimal("250.00")
        ));

        deactivateService.deactivate(created.id());
        CreateCreditCardResponse replacement = createService.create(request(
                "VISA", null, new BigDecimal("300.00")
        ));
        assertThat(replacement.active()).isTrue();

        User otherPrincipal = createUser(Role.PRINCIPAL, "card-other@aurora.com", null);
        setAuthenticatedUser(otherPrincipal);
        assertThat(listService.list().cards()).isEmpty();
        assertThatThrownBy(() -> deactivateService.deactivate(created.id()))
                .isInstanceOf(ResourceNotFoundException.class);

        setAuthenticatedUser(principal);
        var cards = listService.list().cards();
        assertThat(cards).hasSize(2);
        assertThat(cards.stream().filter(card -> card.id().equals(created.id())).findFirst().orElseThrow().active())
                .isFalse();
    }

    @Test
    void limitCannotBeReducedBelowCommitmentAndExistingInvoiceDatesRemainFixed() {
        User principal = createUser(Role.PRINCIPAL, "card-limit-owner@aurora.com", null);
        var card = createCard(principal, new BigDecimal("100.00"), 15, 10);
        setAuthenticatedUser(principal);
        var expense = expenseService.registerExpense(RegisterExpenseRequest.builder()
                .amount(new BigDecimal("80.00"))
                .expenseDate(LocalDate.of(2026, 11, 14))
                .category("Compras")
                .paymentMethod(ExpensePaymentMethod.CARTAO_CREDITO)
                .build());
        var oldInvoice = installmentRepository.findByExpenseIdOrderByInstallmentNumber(expense.getId())
                .getFirst().getInvoice();

        assertThatThrownBy(() -> updateService.update(card.getId(), updateRequest(new BigDecimal("79.99"), 20, 9)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("comprometido");

        updateService.update(card.getId(), updateRequest(new BigDecimal("100.00"), 20, 9));
        assertThat(invoiceRepository.findById(oldInvoice.getId()).orElseThrow().getClosingDate())
                .isEqualTo(LocalDate.of(2026, 11, 15));

        expenseService.registerExpense(RegisterExpenseRequest.builder()
                .amount(new BigDecimal("20.00"))
                .expenseDate(LocalDate.of(2026, 11, 14))
                .category("Compras")
                .paymentMethod(ExpensePaymentMethod.CARTAO_CREDITO)
                .build());
        assertThat(invoiceRepository.findByFamilyGroupIdOrderByClosingDateDesc(
                principal.getFamilyGroup().getId()
        )).extracting("closingDate").contains(LocalDate.of(2026, 11, 20));
    }

    @Test
    void dependentIsBlockedAtTheAdministrativeEndpoint() throws Exception {
        mockMvc.perform(get("/api/credit-cards").with(user("dependent").roles("DEPENDENTE")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/credit-cards/invoices").with(user("dependent").roles("DEPENDENTE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void otherNetworkRequiresAnIdentificationAndOtherNetworksRejectIt() {
        User principal = createUser(Role.PRINCIPAL, "card-network@aurora.com", null);
        setAuthenticatedUser(principal);

        assertThatThrownBy(() -> createService.create(request(
                "OUTRA", "  ", new BigDecimal("100.00")
        ))).isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> createService.create(request(
                "VISA", "Outra", new BigDecimal("100.00")
        ))).isInstanceOf(ValidationException.class);
    }

    private CreateCreditCardRequest request(String network, String otherName, BigDecimal limit) {
        return CreateCreditCardRequest.builder()
                .name("Cartão da família")
                .issuer("Banco Aurora")
                .network(br.com.aurora.shared.domain.CreditCardNetwork.valueOf(network))
                .otherNetworkName(otherName)
                .totalLimit(limit)
                .closingDay(15)
                .dueDay(10)
                .build();
    }

    private UpdateCreditCardRequest updateRequest(BigDecimal limit, int closingDay, int dueDay) {
        return UpdateCreditCardRequest.builder()
                .name("Cartão da família")
                .issuer("Banco Aurora")
                .network(br.com.aurora.shared.domain.CreditCardNetwork.VISA)
                .totalLimit(limit)
                .closingDay(closingDay)
                .dueDay(dueDay)
                .build();
    }
}
