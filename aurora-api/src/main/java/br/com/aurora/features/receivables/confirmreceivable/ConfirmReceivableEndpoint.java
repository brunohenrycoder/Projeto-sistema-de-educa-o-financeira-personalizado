package br.com.aurora.features.receivables.confirmreceivable;

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
@RequestMapping({"/api/receivables", "/receivables"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class ConfirmReceivableEndpoint {

    private final ConfirmReceivableService service;

    @PostMapping("/{receivableId}/confirm")
    @ResponseStatus(HttpStatus.CREATED)
    public ConfirmReceivableResponse confirm(
            @PathVariable UUID receivableId,
            @Valid @RequestBody ConfirmReceivableRequest request
    ) {
        return service.confirm(receivableId, request);
    }
}
