package br.com.aurora.features.expenses.updateexpense;

import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.Role;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record UpdateExpenseResponse(
        UUID id,
        UUID familyGroupId,
        UUID userId,
        String userName,
        Role userRole,
        BigDecimal amount,
        LocalDate expenseDate,
        String category,
        ExpensePaymentMethod paymentMethod,
        String description,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
