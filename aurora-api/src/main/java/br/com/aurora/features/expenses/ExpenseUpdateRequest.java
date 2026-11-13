package br.com.aurora.features.expenses;

import br.com.aurora.shared.domain.ExpensePaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseUpdateRequest {

    @DecimalMin(value = "0.01", message = "O valor da despesa deve ser maior que zero.")
    private BigDecimal amount;

    private LocalDate expenseDate;

    @NotBlank(message = "A categoria da despesa é obrigatória.")
    @Size(max = 50, message = "A categoria deve ter no máximo 50 caracteres.")
    private String category;

    private ExpensePaymentMethod paymentMethod;

    @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres.")
    private String description;
}
