package br.com.aurora.features.receivables.listreceivables;

import br.com.aurora.shared.domain.ReceivableRecurrence;
import br.com.aurora.shared.domain.ReceivableStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ListReceivablesResponse(List<ReceivableItem> receivables) {

    public record ReceivableItem(
            UUID id,
            UUID recurrenceSeriesId,
            int occurrenceNumber,
            String description,
            BigDecimal expectedAmount,
            LocalDate expectedDate,
            LocalDate receivedDate,
            ReceivableRecurrence recurrence,
            ReceivableStatus status
    ) {
    }
}
