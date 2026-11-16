package br.com.aurora.features.payablebills.listpayablebills;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/payable-bills", "/payable-bills"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class ListPayableBillsEndpoint {

    private final ListPayableBillsService service;

    @GetMapping
    public ListPayableBillsResponse list() {
        return service.list();
    }
}
