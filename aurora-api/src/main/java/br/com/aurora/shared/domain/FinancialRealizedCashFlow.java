package br.com.aurora.shared.domain;

import java.math.BigDecimal;

public record FinancialRealizedCashFlow(
        BigDecimal realizedIncome,
        BigDecimal realizedExpenses
) {
}
