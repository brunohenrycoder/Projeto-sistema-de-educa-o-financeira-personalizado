package br.com.aurora.features.creditcards.registercreditcardpayment;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/credit-cards/invoices")
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class RegisterCreditCardPaymentEndpoint {

    private final RegisterCreditCardPaymentService service;

    @PostMapping("/{invoiceId}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterCreditCardPaymentResponse register(
            @PathVariable UUID invoiceId,
            @Valid @RequestBody RegisterCreditCardPaymentRequest request
    ) {
        return service.register(invoiceId, request);
    }
}
