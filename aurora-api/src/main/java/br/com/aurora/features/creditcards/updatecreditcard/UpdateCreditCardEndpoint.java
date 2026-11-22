package br.com.aurora.features.creditcards.updatecreditcard;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/credit-cards")
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class UpdateCreditCardEndpoint {

    private final UpdateCreditCardService service;

    @PutMapping("/{cardId}")
    public UpdateCreditCardResponse update(
            @PathVariable UUID cardId,
            @Valid @RequestBody UpdateCreditCardRequest request
    ) {
        return service.update(cardId, request);
    }
}
