package br.com.aurora.features.receivables.createreceivable;

import br.com.aurora.shared.domain.ReceivableRecurrence;
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
public class CreateReceivableRequest {

    @NotBlank(message = "A descrição do recebimento é obrigatória.")
    @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres.")
    private String description;

    @NotNull(message = "O valor esperado é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor esperado deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "O valor deve ter no máximo duas casas decimais.")
    private BigDecimal expectedAmount;

    @NotNull(message = "A data prevista é obrigatória.")
    private LocalDate expectedDate;

    @NotNull(message = "A recorrência é obrigatória.")
    private ReceivableRecurrence recurrence;
}
