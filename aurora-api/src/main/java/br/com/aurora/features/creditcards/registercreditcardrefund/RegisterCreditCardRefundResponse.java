package br.com.aurora.features.creditcards.registercreditcardrefund;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record RegisterCreditCardRefundResponse(
        UUID id,
        UUID expenseId,
        BigDecimal amount,
        BigDecimal amountAppliedToFutureInstallments,
        BigDecimal amountAppliedToInvoices,
        BigDecimal pendingCreditAmount,
        LocalDateTime createdAt
) {
}
