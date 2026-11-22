package br.com.aurora.features.reportsanalytics.getcategoryvariations;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

public record GetCategoryVariationsResponse(
        YearMonth period,
        boolean analysisAvailable,
        int historyMonthsUsed,
        List<CategoryVariation> variations
) {
    public record CategoryVariation(
            String category,
            BigDecimal currentAmount,
            BigDecimal historicalAverage,
            BigDecimal variationPercent
    ) {
    }
}
