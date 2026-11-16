package br.com.aurora.features.receivables.getreceivablehistory;

import br.com.aurora.shared.domain.ReceivableStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ReceivableHistoryResponse(
        UUID receivableId,
        List<HistoryEntry> history,
        Confirmation confirmation
) {

    public record HistoryEntry(
            UUID id,
            String changedBy,
            LocalDateTime changedAt,
            ReceivableStatus previousStatus,
            ReceivableStatus status,
            String previousDescription,
            String description,
            BigDecimal previousExpectedAmount,
            BigDecimal expectedAmount,
            LocalDate previousExpectedDate,
            LocalDate expectedDate
    ) {
    }

    public record Confirmation(
            BigDecimal amount,
            LocalDate expectedDate,
            LocalDate receivedDate,
            String receivedBy
    ) {
    }
}
