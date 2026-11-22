package br.com.aurora.features.reportsanalytics.getcategoryvariations;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/reports-analytics/category-variations", "/reports-analytics/category-variations"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class GetCategoryVariationsEndpoint {

    private final GetCategoryVariationsService service;

    @GetMapping
    public GetCategoryVariationsResponse get(
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) UUID memberId
    ) {
        return service.get(new GetCategoryVariationsRequest(month, category, memberId));
    }
}
