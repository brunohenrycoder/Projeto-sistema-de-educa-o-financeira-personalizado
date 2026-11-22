package br.com.aurora.features.receivables.createreceivable;

import br.com.aurora.shared.domain.ReceivableRecurrence;
import br.com.aurora.shared.domain.ReceivableStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreateReceivableResponse(
        UUID id,
        UUID recurrenceSeriesId,
        int occurrenceNumber,
        String description,
        BigDecimal expectedAmount,
        LocalDate expectedDate,
        ReceivableRecurrence recurrence,
        ReceivableStatus status
) {
}
