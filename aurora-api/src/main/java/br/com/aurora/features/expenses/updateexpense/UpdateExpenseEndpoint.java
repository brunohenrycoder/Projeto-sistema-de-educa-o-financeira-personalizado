package br.com.aurora.features.expenses.updateexpense;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/expenses", "/expenses"})
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class UpdateExpenseEndpoint {

    private final UpdateExpenseService updateExpenseService;

    @PutMapping("/{expenseId}")
    public UpdateExpenseResponse updateExpense(
            @PathVariable UUID expenseId,
            @Valid @RequestBody UpdateExpenseRequest request
    ) {
        return updateExpenseService.updateExpense(expenseId, request);
    }
}
