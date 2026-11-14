package br.com.aurora.features.creditcards.listcreditcardinvoices;

import br.com.aurora.shared.domain.CreditCardInvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ListCreditCardInvoicesResponse(List<Invoice> invoices) {

    public record Invoice(
            UUID id,
            UUID cardId,
            LocalDate cycleStart,
            LocalDate closingDate,
            LocalDate dueDate,
            CreditCardInvoiceStatus status,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            BigDecimal creditAmount,
            BigDecimal outstandingAmount
    ) {
    }
}
