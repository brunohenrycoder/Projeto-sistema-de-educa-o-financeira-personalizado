package br.com.aurora.shared.domain;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FinancialOverviewCalculator {

    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final FinancialOverviewDataRepository dataRepository;
    private final FinancialConsumptionCalculator consumptionCalculator;

    @SuppressWarnings("null")
public FinancialOverviewTotals calculate(UUID familyGroupId, YearMonth month) {
        List<Receivable> expectedReceivables = dataRepository.findExpectedReceivables(familyGroupId, month);
        List<ReceivableConfirmation> confirmations = dataRepository.findReceivedReceivables(familyGroupId, month);
        List<PayableBill> expectedBills = dataRepository.findExpectedBills(familyGroupId, month);
        List<PayableBillPayment> billPayments = dataRepository.findPaidBillPayments(familyGroupId, month);
        List<CreditCardInvoice> invoices = dataRepository.findInvoicesDue(familyGroupId, month);
        List<CreditCardPayment> cardPayments = dataRepository.findCardPayments(familyGroupId, month);
        BigDecimal realizedIncome = sum(confirmations.stream().map(ReceivableConfirmation::getAmount).toList());
        BigDecimal plannedIncome = sum(expectedReceivables.stream().map(Receivable::getExpectedAmount).toList());

        BigDecimal realizedExpenses = sum(dataRepository.findDirectCashExpenses(familyGroupId, month)
                .stream().map(Expense::getAmount).toList());
        realizedExpenses = realizedExpenses.add(sum(billPayments.stream()
                .filter(payment -> payment.getPaymentMethod() != ExpensePaymentMethod.CARTAO_CREDITO)
                .map(PayableBillPayment::getAmount)
                .toList()));
        realizedExpenses = realizedExpenses.add(sum(cardPayments.stream().map(CreditCardPayment::getAmount).toList()));

        BigDecimal plannedExpenses = sum(expectedBills.stream().map(PayableBill::getAmount).toList());
        plannedExpenses = plannedExpenses.add(sum(invoices.stream()
                .map(CreditCardInvoice::getOutstandingAmount)
                .toList()));

        BigDecimal incomeConsidered = realizedIncome.add(plannedIncome);
        BigDecimal expensesConsidered = sum(consumptionCalculator.findConsumptionItems(
                        familyGroupId, month.atDay(1), month.atEndOfMonth())
                .stream()
                .map(FinancialConsumptionItem::amount)
                .toList());
        expensesConsidered = expensesConsidered.add(sum(expectedBills.stream()
                .map(PayableBill::getAmount)
                .toList()));

        return new FinancialOverviewTotals(
                realizedIncome,
                plannedIncome,
                realizedExpenses,
                plannedExpenses,
                incomeConsidered,
                expensesConsidered
        );
    }

    @SuppressWarnings("null")
private BigDecimal sum(List<BigDecimal> values) {
        return values.stream().reduce(ZERO, BigDecimal::add);
    }
}
