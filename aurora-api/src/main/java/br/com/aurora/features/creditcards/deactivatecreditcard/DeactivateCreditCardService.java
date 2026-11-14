package br.com.aurora.features.creditcards.deactivatecreditcard;

import br.com.aurora.shared.domain.CreditCard;
import br.com.aurora.shared.domain.CreditCardRepository;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.security.CreditCardAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeactivateCreditCardService {

    private final CreditCardAccess access;
    private final CreditCardRepository cardRepository;

    @Transactional
    public void deactivate(UUID cardId) {
        var principal = access.requirePrincipal();
        CreditCard card = cardRepository.findActiveByIdForUpdate(cardId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Cartão ativo não encontrado no grupo familiar."));
        card.setActive(false);
        cardRepository.save(card);
    }
}
