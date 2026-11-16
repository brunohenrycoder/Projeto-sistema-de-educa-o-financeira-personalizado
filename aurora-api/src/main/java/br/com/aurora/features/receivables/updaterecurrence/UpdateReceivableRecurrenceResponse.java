package br.com.aurora.features.receivables.updaterecurrence;

import br.com.aurora.shared.domain.ReceivableRecurrence;

import java.time.LocalDate;
import java.util.UUID;

public record UpdateReceivableRecurrenceResponse(
        UUID recurrenceSeriesId,
        ReceivableRecurrence recurrence,
        LocalDate nextExpectedDate,
        int updatedOccurrences
) {
}
