package br.com.aurora.features.financialgoals.createfinancialgoal;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record CreateFinancialGoalResponse(
        UUID id,
        BigDecimal targetAmount,
        LocalDateTime createdAt
) {
}
