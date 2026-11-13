package br.com.aurora.features.expenses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseFilterRequest {
    private LocalDate startDate;
    private LocalDate endDate;
    private String category;
    private UUID memberId;
}
