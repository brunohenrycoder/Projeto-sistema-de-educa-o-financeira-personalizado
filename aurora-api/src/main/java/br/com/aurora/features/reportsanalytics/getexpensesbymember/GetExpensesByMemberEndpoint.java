package br.com.aurora.features.reportsanalytics.getexpensesbymember;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/reports-analytics/expenses/by-member", "/reports-analytics/expenses/by-member"})
@PreAuthorize("hasRole('PRINCIPAL')")
@RequiredArgsConstructor
public class GetExpensesByMemberEndpoint {

    private final GetExpensesByMemberService service;

    @GetMapping
    public List<GetExpensesByMemberResponse> get(@Valid @ModelAttribute GetExpensesByMemberRequest request) {
        return service.get(request);
    }
}
