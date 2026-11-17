package br.com.aurora.features.reportsanalytics.getexpensesbycategory;

import java.math.BigDecimal;

public record GetExpensesByCategoryResponse(
        String category,
        BigDecimal totalAmount
) {
}
