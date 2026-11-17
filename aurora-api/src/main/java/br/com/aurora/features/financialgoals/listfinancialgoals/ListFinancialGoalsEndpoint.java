package br.com.aurora.features.financialgoals.listfinancialgoals;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/financial-goals", "/financial-goals"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class ListFinancialGoalsEndpoint {

    private final ListFinancialGoalsService service;

    @GetMapping
    public List<ListFinancialGoalsResponse> list() {
        return service.list();
    }
}
