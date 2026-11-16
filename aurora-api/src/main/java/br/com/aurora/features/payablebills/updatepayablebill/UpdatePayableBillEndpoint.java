package br.com.aurora.features.payablebills.updatepayablebill;

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
@RequestMapping({"/api/payable-bills", "/payable-bills"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class UpdatePayableBillEndpoint {

    private final UpdatePayableBillService service;

    @PutMapping("/{billId}")
    public UpdatePayableBillResponse update(
            @PathVariable UUID billId,
            @Valid @RequestBody UpdatePayableBillRequest request
    ) {
        return service.update(billId, request);
    }
}
