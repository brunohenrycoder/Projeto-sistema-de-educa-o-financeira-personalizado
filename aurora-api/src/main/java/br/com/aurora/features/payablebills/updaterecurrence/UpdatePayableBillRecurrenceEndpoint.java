package br.com.aurora.features.payablebills.updaterecurrence;

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
public class UpdatePayableBillRecurrenceEndpoint {

    private final UpdatePayableBillRecurrenceService service;

    @PutMapping("/{billId}/recurrence")
    public UpdatePayableBillRecurrenceResponse update(
            @PathVariable UUID billId,
            @Valid @RequestBody UpdatePayableBillRecurrenceRequest request
    ) {
        return service.update(billId, request);
    }
}
