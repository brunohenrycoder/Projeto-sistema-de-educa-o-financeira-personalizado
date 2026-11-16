package br.com.aurora.features.financialoverview;

import br.com.aurora.shared.domain.CreditCardInstallment;
import br.com.aurora.shared.domain.CreditCardInvoice;
import br.com.aurora.shared.domain.CreditCardPayment;
import br.com.aurora.shared.domain.CreditCardRefund;
import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.PayableBill;
import br.com.aurora.shared.domain.PayableBillPayment;
import br.com.aurora.shared.domain.Receivable;
import br.com.aurora.shared.domain.ReceivableConfirmation;
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

    @SuppressWarnings("null")
public FinancialOverviewTotals calculate(UUID familyGroupId, YearMonth month) {
        List<Receivable> expectedReceivables = dataRepository.findExpectedReceivables(familyGroupId, month);
        List<ReceivableConfirmation> confirmations = dataRepository.findReceivedReceivables(familyGroupId, month);
        List<Expense> expenses = dataRepository.findActiveExpenses(familyGroupId, month);
        List<PayableBill> expectedBills = dataRepository.findExpectedBills(familyGroupId, month);
        List<PayableBillPayment> billPayments = dataRepository.findPaidBillPayments(familyGroupId, month);
        List<CreditCardInvoice> invoices = dataRepository.findInvoicesDue(familyGroupId, month);
        List<CreditCardPayment> cardPayments = dataRepository.findCardPayments(familyGroupId, month);
        List<CreditCardInstallment> installments = dataRepository.findInstallmentsDue(familyGroupId, month);
        List<CreditCardRefund> refunds = dataRepository.findRefunds(familyGroupId, month);

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
        BigDecimal expensesConsidered = sum(expenses.stream()
                .filter(expense -> expense.getPaymentMethod() != ExpensePaymentMethod.CARTAO_CREDITO)
                .map(Expense::getAmount)
                .toList());
        expensesConsidered = expensesConsidered.add(sum(installments.stream()
                .map(installment -> installment.getAmount()
                        .subtract(installment.getRefundedAmount()).max(ZERO))
                .toList()));
        expensesConsidered = expensesConsidered.add(sum(expectedBills.stream()
                .map(PayableBill::getAmount)
                .toList()));
        expensesConsidered = expensesConsidered.subtract(sum(refunds.stream()
                .map(CreditCardRefund::getAmount)
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
