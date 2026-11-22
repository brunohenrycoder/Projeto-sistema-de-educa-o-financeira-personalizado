package br.com.aurora.features.receivables.getreceivablehistory;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/receivables", "/receivables"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class GetReceivableHistoryEndpoint {

    private final GetReceivableHistoryService service;

    @GetMapping("/{receivableId}/history")
    public ReceivableHistoryResponse getHistory(@PathVariable UUID receivableId) {
        return service.getHistory(receivableId);
    }
}
