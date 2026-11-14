package br.com.aurora.features.expenses.deleteexpense;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/expenses", "/expenses"})
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class DeleteExpenseEndpoint {

    private final DeleteExpenseService deleteExpenseService;

    @DeleteMapping("/{expenseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteExpense(@PathVariable UUID expenseId) {
        deleteExpenseService.deleteExpense(expenseId);
    }
}
