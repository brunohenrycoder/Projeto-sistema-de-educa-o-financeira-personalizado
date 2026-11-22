package br.com.aurora.features.receivables.cancelreceivable;

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
@RequestMapping({"/api/receivables", "/receivables"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class CancelReceivableEndpoint {

    private final CancelReceivableService service;

    @PostMapping("/{receivableId}/cancel")
    public CancelReceivableResponse cancel(
            @PathVariable UUID receivableId,
            @Valid @RequestBody CancelReceivableRequest request
    ) {
        return service.cancel(receivableId, request);
    }
}
