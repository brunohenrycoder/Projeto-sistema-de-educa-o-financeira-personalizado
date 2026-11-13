package br.com.aurora.features.expenses;

import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseResponse {
    private UUID id;
    private UUID familyGroupId;
    private UUID userId;
    private String userName;
    private Role userRole;
    private BigDecimal amount;
    private LocalDate expenseDate;
    private String category;
    private ExpensePaymentMethod paymentMethod;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
