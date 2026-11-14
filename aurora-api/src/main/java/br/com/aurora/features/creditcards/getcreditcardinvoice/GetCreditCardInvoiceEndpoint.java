package br.com.aurora.features.creditcards.getcreditcardinvoice;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/credit-cards/invoices")
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class GetCreditCardInvoiceEndpoint {

    private final GetCreditCardInvoiceService service;

    @GetMapping("/{invoiceId}")
    public GetCreditCardInvoiceResponse get(@PathVariable UUID invoiceId) {
        return service.get(invoiceId);
    }
}
