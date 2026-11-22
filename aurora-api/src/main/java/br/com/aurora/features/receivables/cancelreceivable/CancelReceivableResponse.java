package br.com.aurora.features.receivables.cancelreceivable;

import java.util.List;
import java.util.UUID;

public record CancelReceivableResponse(
        List<UUID> cancelledReceivableIds,
        boolean recurrenceActive
) {
}
