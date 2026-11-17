package br.com.aurora.features.financialgoals.createfinancialgoal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateFinancialGoalRequest(
        @NotNull(message = "O valor-alvo da meta é obrigatório.")
        @DecimalMin(value = "0.01", message = "O valor-alvo da meta deve ser maior que zero.")
        @Digits(integer = 10, fraction = 2, message = "O valor-alvo deve ter no máximo duas casas decimais.")
        BigDecimal targetAmount
) {
}
