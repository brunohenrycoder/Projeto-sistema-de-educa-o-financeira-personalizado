package br.com.aurora.features.reportsanalytics.getexpensesbycategory;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/reports-analytics/expenses/by-category", "/reports-analytics/expenses/by-category"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class GetExpensesByCategoryEndpoint {

    private final GetExpensesByCategoryService service;

    @GetMapping
    public List<GetExpensesByCategoryResponse> get(@Valid @ModelAttribute GetExpensesByCategoryRequest request) {
        return service.get(request);
    }
}
