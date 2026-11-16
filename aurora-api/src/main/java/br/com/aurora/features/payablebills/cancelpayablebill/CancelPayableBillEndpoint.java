package br.com.aurora.features.payablebills.cancelpayablebill;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/payable-bills", "/payable-bills"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class CancelPayableBillEndpoint {

    private final CancelPayableBillService service;

    @PostMapping("/{billId}/cancel")
    public CancelPayableBillResponse cancel(
            @PathVariable UUID billId,
            @Valid @RequestBody CancelPayableBillRequest request
    ) {
        return service.cancel(billId, request);
    }
}
