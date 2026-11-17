package br.com.aurora.features.financialgoals.listfinancialgoals;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record ListFinancialGoalsResponse(
        UUID id,
        BigDecimal targetAmount,
        LocalDateTime createdAt
) {
}
