package br.com.aurora.features.payablebills.createpayablebill;

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
@RequestMapping({"/api/payable-bills", "/payable-bills"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class CreatePayableBillEndpoint {

    private final CreatePayableBillService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreatePayableBillResponse create(@Valid @RequestBody CreatePayableBillRequest request) {
        return service.create(request);
    }
}
