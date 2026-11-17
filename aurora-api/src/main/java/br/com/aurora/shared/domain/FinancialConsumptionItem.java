package br.com.aurora.shared.domain;

import java.math.BigDecimal;
import java.util.UUID;

public record FinancialConsumptionItem(
        UUID userId,
        String userName,
        String category,
        BigDecimal amount
) {
}
