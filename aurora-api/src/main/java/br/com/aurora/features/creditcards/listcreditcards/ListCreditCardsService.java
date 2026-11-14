package br.com.aurora.features.creditcards.listcreditcards;

import br.com.aurora.shared.domain.CreditCard;
import br.com.aurora.shared.domain.CreditCardLedger;
import br.com.aurora.shared.domain.CreditCardRepository;
import br.com.aurora.shared.domain.CreditCardRefundCreditRepository;
import br.com.aurora.shared.security.CreditCardAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ListCreditCardsService {

    private static final String LIMIT_DISCLAIMER =
            "O limite disponível é uma estimativa do Aurora, não o limite informado pelo banco.";

    private final CreditCardAccess access;
    private final CreditCardRepository cardRepository;
    private final CreditCardRefundCreditRepository refundCreditRepository;
    private final CreditCardLedger ledger;

    @Transactional(readOnly = true)
    public ListCreditCardsResponse list() {
        var principal = access.requirePrincipal();
        return new ListCreditCardsResponse(cardRepository
                .findByFamilyGroupIdOrderByCreatedAtDesc(principal.getFamilyGroup().getId())
                .stream()
                .map(this::toResponse)
                .toList());
    }

    private ListCreditCardsResponse.Card toResponse(CreditCard card) {
        BigDecimal committed = ledger.getCommittedAmount(card.getId());
        return new ListCreditCardsResponse.Card(
                card.getId(), card.getName(), card.getIssuer(), card.getNetwork(), card.getOtherNetworkName(),
                card.getLastFourDigits(), card.getTotalLimit(), committed,
                card.getTotalLimit().subtract(committed).max(BigDecimal.ZERO),
                refundCreditRepository.sumPendingAmountByCardId(card.getId()),
                committed.compareTo(card.getTotalLimit()) > 0, card.getClosingDay(), card.getDueDay(),
                card.isActive(), LIMIT_DISCLAIMER, card.getCreatedAt(), card.getUpdatedAt()
        );
    }
}
