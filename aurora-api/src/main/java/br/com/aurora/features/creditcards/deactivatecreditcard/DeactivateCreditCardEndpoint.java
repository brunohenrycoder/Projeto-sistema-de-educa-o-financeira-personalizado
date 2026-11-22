package br.com.aurora.features.creditcards.deactivatecreditcard;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/credit-cards")
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class DeactivateCreditCardEndpoint {

    private final DeactivateCreditCardService service;

    @DeleteMapping("/{cardId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable UUID cardId) {
        service.deactivate(cardId);
    }
}
