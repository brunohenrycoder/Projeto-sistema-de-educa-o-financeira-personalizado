package br.com.aurora.features.financialgoals;

import br.com.aurora.shared.domain.FinancialOverviewCalculator;
import br.com.aurora.shared.domain.FinancialRealizedCashFlow;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FinancialGoalsSavingsCalculator {

    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final int REFERENCE_MONTH_COUNT = 3;

    private final FinancialOverviewCalculator overviewCalculator;

    public BigDecimal averageRealizedSurplus(UUID familyGroupId, YearMonth currentMonth) {
        BigDecimal totalSurplus = ZERO;
        for (int monthsAgo = REFERENCE_MONTH_COUNT; monthsAgo >= 1; monthsAgo--) {
            FinancialRealizedCashFlow cashFlow = overviewCalculator.calculateRealizedCashFlow(
                    familyGroupId, currentMonth.minusMonths(monthsAgo));
            totalSurplus = totalSurplus.add(cashFlow.realizedIncome().subtract(cashFlow.realizedExpenses()));
        }
        return totalSurplus.divide(BigDecimal.valueOf(REFERENCE_MONTH_COUNT), 2, RoundingMode.HALF_UP);
    }
}
