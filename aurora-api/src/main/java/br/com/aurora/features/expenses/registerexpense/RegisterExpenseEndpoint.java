package br.com.aurora.features.expenses.registerexpense;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/expenses", "/expenses"})
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class RegisterExpenseEndpoint {

    private final RegisterExpenseService registerExpenseService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterExpenseResponse registerExpense(@Valid @RequestBody RegisterExpenseRequest request) {
        return registerExpenseService.registerExpense(request);
    }
}
