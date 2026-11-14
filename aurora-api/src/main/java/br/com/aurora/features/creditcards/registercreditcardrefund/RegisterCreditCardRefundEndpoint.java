package br.com.aurora.features.creditcards.registercreditcardrefund;

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
@RequestMapping("/api/credit-cards/expenses")
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class RegisterCreditCardRefundEndpoint {

    private final RegisterCreditCardRefundService service;

    @PostMapping("/{expenseId}/refunds")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterCreditCardRefundResponse register(
            @PathVariable UUID expenseId,
            @Valid @RequestBody RegisterCreditCardRefundRequest request
    ) {
        return service.register(expenseId, request);
    }
}
