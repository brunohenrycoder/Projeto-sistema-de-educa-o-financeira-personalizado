package br.com.aurora.features.receivables.listreceivables;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/receivables", "/receivables"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class ListReceivablesEndpoint {

    private final ListReceivablesService service;

    @GetMapping
    public ListReceivablesResponse list() {
        return service.list();
    }
}
