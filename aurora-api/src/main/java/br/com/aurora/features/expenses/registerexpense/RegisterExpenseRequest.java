package br.com.aurora.features.expenses.registerexpense;

import br.com.aurora.shared.domain.ExpensePaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
public class RegisterExpenseRequest {

    @NotNull(message = "O valor da despesa é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor da despesa deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "O valor da despesa deve ter no máximo duas casas decimais.")
    private BigDecimal amount;

    @NotNull(message = "A data da despesa é obrigatória.")
    private LocalDate expenseDate;

    @NotBlank(message = "A categoria da despesa é obrigatória.")
    @Size(max = 50, message = "A categoria deve ter no máximo 50 caracteres.")
    private String category;

    @NotNull(message = "O método de pagamento é obrigatório.")
    private ExpensePaymentMethod paymentMethod;

    @Min(value = 1, message = "A compra deve ter de 1 a 36 parcelas.")
    @Max(value = 36, message = "A compra deve ter de 1 a 36 parcelas.")
    private Integer installmentCount;

    @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres.")
    private String description;
}
