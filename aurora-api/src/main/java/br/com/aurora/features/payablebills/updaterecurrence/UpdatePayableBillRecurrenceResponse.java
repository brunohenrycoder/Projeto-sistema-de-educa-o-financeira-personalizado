package br.com.aurora.features.payablebills.updaterecurrence;

import br.com.aurora.shared.domain.PayableBillRecurrence;

import java.time.LocalDate;
import java.util.UUID;

public record UpdatePayableBillRecurrenceResponse(
        UUID recurrenceSeriesId,
        PayableBillRecurrence recurrence,
        LocalDate nextDueDate,
        int updatedFutureOccurrences
) {
}
