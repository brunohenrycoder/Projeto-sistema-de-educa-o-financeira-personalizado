package br.com.aurora.features.payablebills.cancelpayablebill;

import br.com.aurora.shared.domain.PayableBillStatus;

import java.util.UUID;

public record CancelPayableBillResponse(
        UUID payableBillId,
        PayableBillStatus status,
        int cancelledOccurrences
) {
}
