package br.com.aurora.features.financialoverview;

import java.math.BigDecimal;

public record FinancialOverviewTotals(
        BigDecimal realizedIncome,
        BigDecimal plannedIncome,
        BigDecimal realizedExpenses,
        BigDecimal plannedExpenses,
        BigDecimal incomeConsidered,
        BigDecimal expensesConsidered
) {
    public BigDecimal projectedBalance() {
        return realizedIncome.add(plannedIncome).subtract(realizedExpenses).subtract(plannedExpenses);
    }
}
