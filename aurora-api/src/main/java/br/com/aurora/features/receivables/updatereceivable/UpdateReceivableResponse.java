package br.com.aurora.features.receivables.updatereceivable;

import br.com.aurora.shared.domain.ReceivableRecurrence;
import br.com.aurora.shared.domain.ReceivableStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record UpdateReceivableResponse(
        UUID id,
        String description,
        BigDecimal expectedAmount,
        LocalDate expectedDate,
        ReceivableRecurrence recurrence,
        ReceivableStatus status
) {
}
