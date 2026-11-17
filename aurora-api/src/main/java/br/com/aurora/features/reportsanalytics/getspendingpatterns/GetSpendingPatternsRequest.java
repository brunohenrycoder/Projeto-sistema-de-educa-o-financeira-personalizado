package br.com.aurora.features.reportsanalytics.getspendingpatterns;

import java.util.UUID;

public record GetSpendingPatternsRequest(
        String month,
        String category,
        UUID memberId
) {
}
