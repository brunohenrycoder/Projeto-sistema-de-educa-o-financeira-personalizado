package br.com.aurora.features.receivables.confirmreceivable;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
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
public class ConfirmReceivableRequest {

    @NotNull(message = "A data efetiva do recebimento é obrigatória.")
    private LocalDate receivedDate;

    @DecimalMin(value = "0.01", message = "O valor recebido deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "O valor recebido deve ter no máximo duas casas decimais.")
    private BigDecimal amount;
}
