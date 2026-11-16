package br.com.aurora.features.payablebills.createpayablebill;

import br.com.aurora.shared.domain.PayableBillCategory;
import br.com.aurora.shared.domain.PayableBillRecurrence;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreatePayableBillRequest {

    @NotBlank(message = "A descrição da conta é obrigatória.")
    @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres.")
    private String description;

    @NotNull(message = "O valor da conta é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor da conta deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "O valor deve ter no máximo duas casas decimais.")
    private BigDecimal amount;

    @NotNull(message = "A data de vencimento é obrigatória.")
    private LocalDate dueDate;

    @NotNull(message = "A categoria é obrigatória.")
    private PayableBillCategory category;

    @NotNull(message = "A recorrência é obrigatória.")
    private PayableBillRecurrence recurrence;
}
