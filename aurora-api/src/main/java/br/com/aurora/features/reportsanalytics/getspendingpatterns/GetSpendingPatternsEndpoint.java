package br.com.aurora.features.reportsanalytics.getspendingpatterns;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/reports-analytics/patterns", "/reports-analytics/patterns"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class GetSpendingPatternsEndpoint {

    private final GetSpendingPatternsService service;

    @GetMapping
    public GetSpendingPatternsResponse get(
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) UUID memberId
    ) {
        return service.get(new GetSpendingPatternsRequest(month, category, memberId));
    }
}
