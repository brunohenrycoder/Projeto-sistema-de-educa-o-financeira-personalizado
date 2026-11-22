package br.com.aurora.features.receivables.updaterecurrence;

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
@RequestMapping({"/api/receivables", "/receivables"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class UpdateReceivableRecurrenceEndpoint {

    private final UpdateReceivableRecurrenceService service;

    @PutMapping("/{receivableId}/recurrence")
    public UpdateReceivableRecurrenceResponse update(
            @PathVariable UUID receivableId,
            @Valid @RequestBody UpdateReceivableRecurrenceRequest request
    ) {
        return service.update(receivableId, request);
    }
}
