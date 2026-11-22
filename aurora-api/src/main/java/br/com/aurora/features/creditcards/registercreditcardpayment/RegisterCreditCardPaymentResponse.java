package br.com.aurora.features.creditcards.registercreditcardpayment;

import br.com.aurora.shared.domain.CreditCardInvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record RegisterCreditCardPaymentResponse(
        UUID id,
        UUID invoiceId,
        BigDecimal amount,
        LocalDateTime paidAt,
        BigDecimal paidAmount,
        BigDecimal outstandingAmount,
        CreditCardInvoiceStatus invoiceStatus
) {
}
