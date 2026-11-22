package br.com.aurora.features.reportsanalytics;

import br.com.aurora.features.creditcards.CreditCardServiceTestSupport;
import br.com.aurora.features.reportsanalytics.getcategoryvariations.GetCategoryVariationsRequest;
import br.com.aurora.features.reportsanalytics.getcategoryvariations.GetCategoryVariationsService;
import br.com.aurora.features.reportsanalytics.getexpensesbycategory.GetExpensesByCategoryRequest;
import br.com.aurora.features.reportsanalytics.getexpensesbycategory.GetExpensesByCategoryService;
import br.com.aurora.features.reportsanalytics.getexpensesbymember.GetExpensesByMemberRequest;
import br.com.aurora.features.reportsanalytics.getexpensesbymember.GetExpensesByMemberService;
import br.com.aurora.features.reportsanalytics.getspendingpatterns.GetSpendingPatternsRequest;
import br.com.aurora.features.reportsanalytics.getspendingpatterns.GetSpendingPatternsService;
import br.com.aurora.shared.domain.CreditCard;
import br.com.aurora.shared.domain.CreditCardInstallment;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.CreditCardInvoice;
import br.com.aurora.shared.domain.CreditCardInvoiceRepository;
import br.com.aurora.shared.domain.CreditCardInvoiceStatus;
import br.com.aurora.shared.domain.CreditCardPayment;
import br.com.aurora.shared.domain.CreditCardPaymentRepository;
import br.com.aurora.shared.domain.CreditCardRefund;
import br.com.aurora.shared.domain.CreditCardRefundRepository;
import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.ExpenseStatus;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.error.ValidationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;


import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class ReportsAnalyticsServiceTest extends CreditCardServiceTestSupport {

    @Autowired private GetExpensesByCategoryService byCategoryService;
    @Autowired private GetExpensesByMemberService byMemberService;
    @Autowired private GetSpendingPatternsService patternsService;
    @Autowired private GetCategoryVariationsService variationsService;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private CreditCardInvoiceRepository invoiceRepository;
    @Autowired private CreditCardInstallmentRepository installmentRepository;
    @Autowired private CreditCardPaymentRepository paymentRepository;
    @Autowired private CreditCardRefundRepository refundRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void reportsGroupActiveConsumptionAndFilterByFamilyMemberAndPeriod() {
        User principal = createUser(Role.PRINCIPAL, "reports-owner@aurora.com", null);
        User dependent = createUser(Role.DEPENDENTE, "reports-dependent@aurora.com", principal.getFamilyGroup());
        User otherPrincipal = createUser(Role.PRINCIPAL, "reports-other@aurora.com", null);
        addExpense(principal, "2026-06-02", "Casa", "100.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(dependent, "2026-06-03", "Casa", "25.00", ExpensePaymentMethod.DINHEIRO, ExpenseStatus.ATIVO);
        addExpense(dependent, "2026-06-04", "Transporte", "40.00",
                ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-06-05", "Casa", "900.00",
                ExpensePaymentMethod.PIX, ExpenseStatus.CANCELADO);
        addExpense(otherPrincipal, "2026-06-06", "Casa", "500.00",
                ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);

        setAuthenticatedUser(principal);
        var categoryReport = byCategoryService.get(new GetExpensesByCategoryRequest(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30), null, null));
        var memberReport = byMemberService.get(new GetExpensesByMemberRequest(
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30), null, dependent.getId()));

        assertThat(categoryReport)
                .extracting(response -> response.category() + ":" + response.totalAmount().toPlainString())
                .containsExactly("Casa:125.00", "Transporte:40.00");
        assertThat(memberReport)
                .extracting(response -> response.memberId() + ":" + response.totalAmount().toPlainString())
                .containsExactly(dependent.getId() + ":65.00");
        assertThatThrownBy(() -> byCategoryService.get(new GetExpensesByCategoryRequest(
                LocalDate.of(2026, 6, 30), LocalDate.of(2026, 6, 1), null, null)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("data inicial");
    }

    @Test
    void cardConsumptionUsesInvoiceCompetenceAndIgnoresPaymentsWhileApplyingRefunds() {
        User principal = createUser(Role.PRINCIPAL, "reports-card-owner@aurora.com", null);
        User dependent = createUser(Role.DEPENDENTE, "reports-card-dependent@aurora.com", principal.getFamilyGroup());
        CreditCard card = createCard(principal, new BigDecimal("1000.00"), 28, 10);
        Expense purchase = addExpense(dependent, "2026-10-03", "Compras", "120.00",
                ExpensePaymentMethod.CARTAO_CREDITO, ExpenseStatus.ATIVO);
        CreditCardInvoice novemberInvoice = addInvoice(
                card, principal, YearMonth.of(2026, 11), "40.00", "20.00");
        installmentRepository.save(installment(novemberInvoice, purchase, 1, "20.00", false));
        CreditCardInvoice decemberInvoice = addInvoice(
                card, principal, YearMonth.of(2026, 12), "40.00", "0.00");
        installmentRepository.save(installment(decemberInvoice, purchase, 2, "0.00", false));
        CreditCardInvoice januaryInvoice = addInvoice(
                card, principal, YearMonth.of(2027, 1), "40.00", "0.00");
        installmentRepository.save(installment(januaryInvoice, purchase, 3, "0.00", false));
        paymentRepository.save(CreditCardPayment.builder()
                .invoice(novemberInvoice)
                .user(principal)
                .amount(new BigDecimal("20.00"))
                .paidAt(LocalDateTime.of(2026, 11, 5, 12, 0))
                .build());
        refundRepository.save(CreditCardRefund.builder()
                .expense(purchase)
                .card(card)
                .user(principal)
                .amount(new BigDecimal("20.00"))
                .createdAt(LocalDateTime.of(2026, 11, 15, 12, 0))
                .build());
        addExpense(dependent, "2026-11-12", "Compras", "75.00",
                ExpensePaymentMethod.CARTAO_CREDITO, ExpenseStatus.CANCELADO);

        setAuthenticatedUser(principal);
        var novemberReport = byCategoryService.get(new GetExpensesByCategoryRequest(
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), null, null));
        var decemberReport = byCategoryService.get(new GetExpensesByCategoryRequest(
                LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 31), null, null));
        var januaryReport = byCategoryService.get(new GetExpensesByCategoryRequest(
                LocalDate.of(2027, 1, 1), LocalDate.of(2027, 1, 31), null, null));

        assertThat(novemberReport).singleElement().satisfies(item -> {
            assertThat(item.category()).isEqualTo("Compras");
            assertThat(item.totalAmount()).isEqualByComparingTo("20.00");
        });
        assertThat(decemberReport).singleElement().extracting(item -> item.totalAmount())
                .isEqualTo(new BigDecimal("40.00"));
        assertThat(januaryReport).singleElement().extracting(item -> item.totalAmount())
                .isEqualTo(new BigDecimal("40.00"));
    }

    @Test
    void patternUsesThreeLatestAvailableMonthsAndIncludesTiesAtThirdPosition() {
        User principal = createUser(Role.PRINCIPAL, "reports-history-owner@aurora.com", null);
        addExpense(principal, "2026-07-04", "Food", "200.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-08-04", "Other", "10.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-09-04", "Food", "900.00", ExpensePaymentMethod.PIX, ExpenseStatus.CANCELADO);
        addExpense(principal, "2026-10-04", "Food", "100.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-06-04", "Food", "5000.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-11-04", "Food", "120.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-11-04", "B", "100.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-11-04", "C", "50.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-11-04", "D", "50.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        setAuthenticatedUser(principal);

        var patterns = patternsService.get(new GetSpendingPatternsRequest("2026-11", null, null));
        var variations = variationsService.get(new GetCategoryVariationsRequest("2026-11", null, null));

        assertThat(patterns.analysisAvailable()).isTrue();
        assertThat(patterns.historyMonthsUsed()).isEqualTo(3);
        assertThat(patterns.topCategories())
                .extracting(item -> item.category() + ":" + item.currentAmount().toPlainString())
                .containsExactly("Food:120.00", "B:100.00", "C:50.00", "D:50.00");
        assertThat(patterns.topCategories().getFirst().historicalAverage()).isEqualByComparingTo("100.00");
        assertThat(patterns.topCategories().stream()
                .filter(item -> item.category().equals("C"))
                .findFirst().orElseThrow().historicalAverage()).isEqualByComparingTo("0.00");
        assertThat(variations.variations()).isEmpty();
    }

    @Test
    void twoHistoryMonthsAreAveragedAndVariationsMustExceedTwentyPercent() {
        User principal = createUser(Role.PRINCIPAL, "reports-two-months@aurora.com", null);
        addExpense(principal, "2026-08-04", "Food", "300.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-10-04", "Food", "100.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-11-04", "Food", "240.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        setAuthenticatedUser(principal);

        var patterns = patternsService.get(new GetSpendingPatternsRequest("2026-11", null, null));
        assertThat(patterns.historyMonthsUsed()).isEqualTo(2);
        assertThat(patterns.topCategories().getFirst().historicalAverage()).isEqualByComparingTo("200.00");
        assertThat(variationsService.get(new GetCategoryVariationsRequest("2026-11", null, null))
                .variations()).isEmpty();

        addExpense(principal, "2026-11-05", "Food", "1.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-11-05", "New", "5.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        var variations = variationsService.get(new GetCategoryVariationsRequest("2026-11", null, null));

        assertThat(variations.variations()).singleElement().satisfies(item -> {
            assertThat(item.category()).isEqualTo("Food");
            assertThat(item.currentAmount()).isEqualByComparingTo("241.00");
            assertThat(item.historicalAverage()).isEqualByComparingTo("200.00");
            assertThat(item.variationPercent()).isEqualByComparingTo("20.50");
        });
    }

    @Test
    void patternsAreUnavailableWithFewerThanTwoHistoricalMonths() {
        User principal = createUser(Role.PRINCIPAL, "reports-short-history@aurora.com", null);
        addExpense(principal, "2026-10-04", "Food", "100.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        addExpense(principal, "2026-09-04", "Food", "900.00", ExpensePaymentMethod.PIX, ExpenseStatus.CANCELADO);
        addExpense(principal, "2026-11-04", "Food", "120.00", ExpensePaymentMethod.PIX, ExpenseStatus.ATIVO);
        setAuthenticatedUser(principal);

        var patterns = patternsService.get(new GetSpendingPatternsRequest("2026-11", null, null));
        var variations = variationsService.get(new GetCategoryVariationsRequest("2026-11", null, null));

        assertThat(patterns.analysisAvailable()).isFalse();
        assertThat(patterns.historyMonthsUsed()).isEqualTo(1);
        assertThat(patterns.topCategories()).isEmpty();
        assertThat(variations.analysisAvailable()).isFalse();
        assertThat(variations.variations()).isEmpty();
    }

    @Test
    void servicesRejectDependentsEvenWhenCalledWithoutTheHttpEndpoint() {
        User principal = createUser(Role.PRINCIPAL, "reports-service-owner@aurora.com", null);
        User dependent = createUser(
                Role.DEPENDENTE, "reports-service-dependent@aurora.com", principal.getFamilyGroup());
        setAuthenticatedUser(dependent);

        assertThatThrownBy(() -> byCategoryService.get(new GetExpensesByCategoryRequest(null, null, null, null)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> patternsService.get(new GetSpendingPatternsRequest("2026-11", null, null)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> variationsService.get(new GetCategoryVariationsRequest("2026-11", null, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    private Expense addExpense(
            User user,
            String date,
            String category,
            String amount,
            ExpensePaymentMethod paymentMethod,
            ExpenseStatus status
    ) {
        Expense.ExpenseBuilder builder = Expense.builder()
                .familyGroup(user.getFamilyGroup())
                .user(user)
                .amount(new BigDecimal(amount))
                .expenseDate(LocalDate.parse(date))
                .category(category)
                .paymentMethod(paymentMethod)
                .status(status);
        if (status == ExpenseStatus.CANCELADO) {
            builder.cancelledBy(user).cancelledAt(LocalDateTime.now());
        }
        return expenseRepository.save(builder.build());
    }

    private CreditCardInvoice addInvoice(
            CreditCard card,
            User principal,
            YearMonth month,
            String total,
            String paid
    ) {
        BigDecimal paidAmount = new BigDecimal(paid);
        return invoiceRepository.save(CreditCardInvoice.builder()
                .card(card)
                .familyGroup(principal.getFamilyGroup())
                .cycleStart(month.minusMonths(1).atDay(1))
                .closingDate(month.minusMonths(1).atDay(28))
                .dueDate(month.atDay(10))
                .status(paidAmount.signum() > 0
                        ? CreditCardInvoiceStatus.PARTIALLY_PAID
                        : CreditCardInvoiceStatus.OPEN)
                .totalAmount(new BigDecimal(total))
                .paidAmount(paidAmount)
                .creditAmount(new BigDecimal("0.00"))
                .build());
    }

    private CreditCardInstallment installment(
            CreditCardInvoice invoice,
            Expense expense,
            int number,
            String paid,
            boolean cancelled
    ) {
        return CreditCardInstallment.builder()
                .invoice(invoice)
                .expense(expense)
                .installmentNumber(number)
                .installmentCount(3)
                .amount(new BigDecimal("40.00"))
                .paidAmount(new BigDecimal(paid))
                .refundedAmount(new BigDecimal("0.00"))
                .creditedAmount(new BigDecimal("0.00"))
                .cancelled(cancelled)
                .build();
    }
}
