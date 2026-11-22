package br.com.aurora.features.creditcards.listcreditcardinvoices;

import br.com.aurora.shared.domain.CreditCardInvoiceStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/credit-cards/invoices")
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class ListCreditCardInvoicesEndpoint {

    private final ListCreditCardInvoicesService service;

    @GetMapping
    public ListCreditCardInvoicesResponse list(
            @RequestParam(required = false) CreditCardInvoiceStatus status
    ) {
        return service.list(status);
    }
}
