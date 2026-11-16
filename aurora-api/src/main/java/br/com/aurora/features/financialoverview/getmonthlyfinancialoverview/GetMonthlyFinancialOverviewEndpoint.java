package br.com.aurora.features.financialoverview.getmonthlyfinancialoverview;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/financial-overview", "/financial-overview"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class GetMonthlyFinancialOverviewEndpoint {

    private final GetMonthlyFinancialOverviewService service;

    @GetMapping
    public GetMonthlyFinancialOverviewResponse get(
            @RequestParam(required = false) String month
    ) {
        return service.get(month);
    }
}
