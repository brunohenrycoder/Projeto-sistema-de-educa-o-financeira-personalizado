package br.com.aurora.features.creditcards.listcreditcards;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/credit-cards")
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class ListCreditCardsEndpoint {

    private final ListCreditCardsService service;

    @GetMapping
    public ListCreditCardsResponse list() {
        return service.list();
    }
}
