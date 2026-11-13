package br.com.aurora.features.expenses;


import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/expenses", "/expenses"})
@RequiredArgsConstructor
public class ExpenseEndpoint {

    private final ExpenseService expenseService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseResponse createExpense(@Valid @RequestBody ExpenseRequest request) {
        return expenseService.createExpense(request);
    }

    @GetMapping
    public List<ExpenseResponse> listExpenses(
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) UUID memberId
    ) {
        ExpenseFilterRequest filter = ExpenseFilterRequest.builder()
                .startDate(startDate)
                .endDate(endDate)
                .category(category)
                .memberId(memberId)
                .build();
        return expenseService.listExpenses(filter);
    }

    @PutMapping("/{expenseId}")
    public ExpenseResponse updateExpense(
            @PathVariable UUID expenseId,
            @Valid @RequestBody ExpenseUpdateRequest request
    ) {
        return expenseService.updateExpense(expenseId, request);
    }

    @DeleteMapping("/{expenseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteExpense(@PathVariable UUID expenseId) {
        expenseService.deleteExpense(expenseId);
    }
}
