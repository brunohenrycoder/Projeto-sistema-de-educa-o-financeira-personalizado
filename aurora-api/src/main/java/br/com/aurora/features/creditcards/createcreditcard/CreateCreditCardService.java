package br.com.aurora.features.creditcards.createcreditcard;

import br.com.aurora.shared.domain.CreditCard;
import br.com.aurora.shared.domain.CreditCardLedger;
import br.com.aurora.shared.domain.CreditCardNetwork;
import br.com.aurora.shared.domain.CreditCardRepository;
import br.com.aurora.shared.domain.CreditCardRefundCreditRepository;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.CreditCardAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class CreateCreditCardService {

    private final CreditCardAccess access;
    private final CreditCardRepository cardRepository;
    private final CreditCardRefundCreditRepository refundCreditRepository;
    private final CreditCardLedger ledger;

    @Transactional
    public CreateCreditCardResponse create(CreateCreditCardRequest request) {
        var principal = access.requirePrincipal();
        if (cardRepository.findActiveForUpdate(principal.getFamilyGroup().getId()).isPresent()) {
            throw new ValidationException("Este grupo familiar já possui um cartão ativo.");
        }
        validateNetwork(request.getNetwork(), request.getOtherNetworkName());
        CreditCard card = cardRepository.save(CreditCard.builder()
                .familyGroup(principal.getFamilyGroup())
                .name(request.getName().trim())
                .issuer(request.getIssuer().trim())
                .network(request.getNetwork())
                .otherNetworkName(normalizeOtherNetwork(request.getNetwork(), request.getOtherNetworkName()))
                .lastFourDigits(request.getLastFourDigits())
                .totalLimit(request.getTotalLimit())
                .closingDay(request.getClosingDay())
                .dueDay(request.getDueDay())
                .active(true)
                .build());
        return response(card);
    }

    private void validateNetwork(CreditCardNetwork network, String otherNetworkName) {
        if (network == CreditCardNetwork.OUTRA
                && (otherNetworkName == null || otherNetworkName.trim().length() < 2
                || otherNetworkName.trim().length() > 40)) {
            throw new ValidationException("Informe a identificação da bandeira, com 2 a 40 caracteres.");
        }
        if (network != CreditCardNetwork.OUTRA && otherNetworkName != null) {
            throw new ValidationException("A identificação adicional só deve ser informada para a bandeira Outra.");
        }
    }

    private String normalizeOtherNetwork(CreditCardNetwork network, String value) {
        return network == CreditCardNetwork.OUTRA ? value.trim() : null;
    }

    private CreateCreditCardResponse response(CreditCard card) {
        BigDecimal committed = ledger.getCommittedAmount(card.getId());
        BigDecimal available = card.getTotalLimit().subtract(committed).max(BigDecimal.ZERO);
        return new CreateCreditCardResponse(
                card.getId(), card.getName(), card.getIssuer(), card.getNetwork(), card.getOtherNetworkName(),
                card.getLastFourDigits(), card.getTotalLimit(), committed, available,
                refundCreditRepository.sumPendingAmountByCardId(card.getId()),
                committed.compareTo(card.getTotalLimit()) > 0, card.getClosingDay(), card.getDueDay(),
                card.isActive(), "O limite disponível é uma estimativa do Aurora, não o limite informado pelo banco.",
                card.getCreatedAt(), card.getUpdatedAt()
        );
    }
}
