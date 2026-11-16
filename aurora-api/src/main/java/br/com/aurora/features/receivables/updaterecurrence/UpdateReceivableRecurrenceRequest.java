package br.com.aurora.features.receivables.updaterecurrence;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
public class UpdateReceivableRecurrenceRequest {

    @NotBlank(message = "A descrição da recorrência é obrigatória.")
    @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres.")
    private String description;

    @NotNull(message = "O valor esperado é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor esperado deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "O valor deve ter no máximo duas casas decimais.")
    private BigDecimal expectedAmount;

    @NotNull(message = "A próxima data prevista é obrigatória.")
    private LocalDate nextExpectedDate;

    @NotNull(message = "O dia de recorrência é obrigatório.")
    @Min(value = 1, message = "O dia de recorrência deve estar entre 1 e 31.")
    @Max(value = 31, message = "O dia de recorrência deve estar entre 1 e 31.")
    private Integer recurrenceDay;
}
