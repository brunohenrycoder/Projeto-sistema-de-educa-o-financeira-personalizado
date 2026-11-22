package br.com.aurora.features.expenses.listexpenses;

import java.time.LocalDate;
import java.util.UUID;

public record ListExpensesFilter(
        LocalDate startDate,
        LocalDate endDate,
        String category,
        UUID memberId
) {
}
