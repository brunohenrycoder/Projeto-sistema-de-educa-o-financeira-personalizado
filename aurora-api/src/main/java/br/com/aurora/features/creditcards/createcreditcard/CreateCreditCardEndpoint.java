package br.com.aurora.features.creditcards.createcreditcard;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/credit-cards")
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class CreateCreditCardEndpoint {

    private final CreateCreditCardService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreateCreditCardResponse create(@Valid @RequestBody CreateCreditCardRequest request) {
        return service.create(request);
    }
}
