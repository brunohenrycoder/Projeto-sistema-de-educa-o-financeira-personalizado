package br.com.aurora.features.creditcards.getcreditcardinvoice;

import br.com.aurora.shared.domain.CreditCardInvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record GetCreditCardInvoiceResponse(
        UUID id,
        UUID cardId,
        LocalDate cycleStart,
        LocalDate closingDate,
        LocalDate dueDate,
        CreditCardInvoiceStatus status,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal creditAmount,
        BigDecimal outstandingAmount,
        List<Installment> installments,
        List<Payment> payments,
        List<CreditApplication> creditApplications,
        List<RefundMovement> refunds
) {

    public record Installment(
            UUID id,
            UUID expenseId,
            String memberName,
            String category,
            BigDecimal amount,
            BigDecimal paidAmount,
            BigDecimal refundedAmount,
            BigDecimal outstandingAmount,
            int installmentNumber,
            int installmentCount,
            boolean cancelled
    ) {
    }

    public record Payment(
            UUID id,
            BigDecimal amount,
            LocalDateTime paidAt,
            String registeredBy
    ) {
    }

    public record CreditApplication(
            UUID id,
            UUID refundId,
            BigDecimal amount,
            BigDecimal remainingCredit,
            LocalDateTime appliedAt
    ) {
    }

    public record RefundMovement(
            UUID id,
            UUID expenseId,
            BigDecimal amount,
            LocalDateTime createdAt,
            String registeredBy
    ) {
    }
}
