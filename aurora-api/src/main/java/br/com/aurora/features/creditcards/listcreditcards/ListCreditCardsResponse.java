package br.com.aurora.features.creditcards.listcreditcards;

import br.com.aurora.shared.domain.CreditCardNetwork;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ListCreditCardsResponse(List<Card> cards) {

    public record Card(
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
}
