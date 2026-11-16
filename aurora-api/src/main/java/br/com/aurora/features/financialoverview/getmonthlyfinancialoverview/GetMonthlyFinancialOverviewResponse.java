package br.com.aurora.features.financialoverview.getmonthlyfinancialoverview;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.UUID;

public record GetMonthlyFinancialOverviewResponse(
        YearMonth period,
        BigDecimal realizedIncome,
        BigDecimal plannedIncome,
        BigDecimal realizedExpenses,
        BigDecimal plannedExpenses,
        BigDecimal projectedBalance,
        BigDecimal incomeConsidered,
        BigDecimal expensesConsidered,
        BigDecimal commitmentPercent,
        BigDecimal alertThresholdPercent,
        boolean thresholdReached,
        Alert alert
) {
    public record Alert(
            UUID id,
            LocalDate referenceMonth,
            BigDecimal thresholdPercent,
            BigDecimal commitmentPercent,
            LocalDateTime createdAt
    ) {
    }
}
