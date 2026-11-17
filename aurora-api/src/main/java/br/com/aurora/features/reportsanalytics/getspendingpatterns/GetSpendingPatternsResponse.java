package br.com.aurora.features.reportsanalytics.getspendingpatterns;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

public record GetSpendingPatternsResponse(
        YearMonth period,
        boolean analysisAvailable,
        int historyMonthsUsed,
        List<CategoryPattern> topCategories
) {
    public record CategoryPattern(
            String category,
            BigDecimal currentAmount,
            BigDecimal historicalAverage,
            BigDecimal variationPercent
    ) {
    }
}
