package br.com.aurora.features.payablebills.updatepayablebill;

import br.com.aurora.shared.domain.PayableBillCategory;
import br.com.aurora.shared.domain.PayableBillRecurrence;
import br.com.aurora.shared.domain.PayableBillStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record UpdatePayableBillResponse(
        UUID id,
        String description,
        BigDecimal amount,
        LocalDate dueDate,
        PayableBillCategory category,
        PayableBillRecurrence recurrence,
        PayableBillStatus status
) {
}
