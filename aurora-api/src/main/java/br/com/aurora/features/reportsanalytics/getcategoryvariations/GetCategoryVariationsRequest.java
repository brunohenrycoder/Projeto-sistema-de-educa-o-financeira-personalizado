package br.com.aurora.features.reportsanalytics.getcategoryvariations;

import java.util.UUID;

public record GetCategoryVariationsRequest(
        String month,
        String category,
        UUID memberId
) {
}
