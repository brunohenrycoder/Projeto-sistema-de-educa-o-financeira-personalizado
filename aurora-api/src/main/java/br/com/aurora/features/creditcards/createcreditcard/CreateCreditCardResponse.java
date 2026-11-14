package br.com.aurora.features.creditcards.createcreditcard;

import br.com.aurora.shared.domain.CreditCardNetwork;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record CreateCreditCardResponse(
        UUID id,
        String name,
        String issuer,
        CreditCardNetwork network,
        String otherNetworkName,
        String lastFourDigits,
        BigDecimal totalLimit,
        BigDecimal limitUsed,
        BigDecimal limitAvailable,
        BigDecimal pendingCreditAmount,
        boolean limitExceeded,
        int closingDay,
        int dueDay,
        boolean active,
        String limitDisclaimer,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
