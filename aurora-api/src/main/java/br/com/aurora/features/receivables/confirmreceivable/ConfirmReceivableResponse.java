package br.com.aurora.features.receivables.confirmreceivable;

import br.com.aurora.shared.domain.ReceivableStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ConfirmReceivableResponse(
        UUID confirmationId,
        UUID receivableId,
        BigDecimal amount,
        LocalDate expectedDate,
        LocalDate receivedDate,
        ReceivableStatus status,
        UUID nextOccurrenceId
) {
}
