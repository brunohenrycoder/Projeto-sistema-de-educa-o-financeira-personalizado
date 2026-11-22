package br.com.aurora.features.creditcards.updatecreditcard;

import br.com.aurora.shared.domain.CreditCard;
import br.com.aurora.shared.domain.CreditCardLedger;
import br.com.aurora.shared.domain.CreditCardNetwork;
import br.com.aurora.shared.domain.CreditCardRepository;
import br.com.aurora.shared.domain.CreditCardRefundCreditRepository;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.CreditCardAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UpdateCreditCardService {

    private final CreditCardAccess access;
    private final CreditCardRepository cardRepository;
    private final CreditCardRefundCreditRepository refundCreditRepository;
    private final CreditCardLedger ledger;

    @Transactional
    public UpdateCreditCardResponse update(UUID cardId, UpdateCreditCardRequest request) {
        var principal = access.requirePrincipal();
        CreditCard card = cardRepository.findActiveByIdForUpdate(cardId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado no grupo familiar."));
        validateNetwork(request.getNetwork(), request.getOtherNetworkName());
        BigDecimal committed = ledger.getCommittedAmount(cardId);
        if (request.getTotalLimit().compareTo(committed) < 0) {
            throw new ValidationException("O limite não pode ser menor que o valor financeiro comprometido.");
        }
        card.setName(request.getName().trim());
        card.setIssuer(request.getIssuer().trim());
        card.setNetwork(request.getNetwork());
        card.setOtherNetworkName(request.getNetwork() == CreditCardNetwork.OUTRA
                ? request.getOtherNetworkName().trim()
                : null);
        card.setLastFourDigits(request.getLastFourDigits());
        card.setTotalLimit(request.getTotalLimit());
        card.setClosingDay(request.getClosingDay());
        card.setDueDay(request.getDueDay());
        return response(cardRepository.save(card), committed);
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

    private UpdateCreditCardResponse response(CreditCard card, BigDecimal committed) {
        BigDecimal available = card.getTotalLimit().subtract(committed).max(BigDecimal.ZERO);
        return new UpdateCreditCardResponse(
                card.getId(), card.getName(), card.getIssuer(), card.getNetwork(), card.getOtherNetworkName(),
                card.getLastFourDigits(), card.getTotalLimit(), committed, available,
                refundCreditRepository.sumPendingAmountByCardId(card.getId()),
                committed.compareTo(card.getTotalLimit()) > 0, card.getClosingDay(), card.getDueDay(),
                card.isActive(), "O limite disponível é uma estimativa do Aurora, não o limite informado pelo banco.",
                card.getCreatedAt(), card.getUpdatedAt()
        );
    }
}
