package br.com.aurora.features.payablebills.listpayablebills;

import br.com.aurora.shared.domain.PayableBillCategory;
import br.com.aurora.shared.domain.PayableBillRecurrence;
import br.com.aurora.shared.domain.PayableBillStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ListPayableBillsResponse(List<PayableBillItem> bills) {

    public record PayableBillItem(
            UUID id,
            UUID recurrenceSeriesId,
            int occurrenceNumber,
            String description,
            BigDecimal amount,
            LocalDate dueDate,
            PayableBillCategory category,
            PayableBillRecurrence recurrence,
            PayableBillStatus status
    ) {
    }
}
