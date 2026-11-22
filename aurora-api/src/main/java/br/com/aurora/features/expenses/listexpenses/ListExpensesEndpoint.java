package br.com.aurora.features.expenses.listexpenses;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/expenses", "/expenses"})
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class ListExpensesEndpoint {

    private final ListExpensesService listExpensesService;

    @GetMapping
    public List<ListExpensesResponse> listExpenses(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) UUID memberId
    ) {
        return listExpensesService.listExpenses(new ListExpensesFilter(startDate, endDate, category, memberId));
    }
}
