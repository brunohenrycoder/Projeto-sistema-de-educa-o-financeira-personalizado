package br.com.aurora.features.creditcards.registercreditcardrefund;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterCreditCardRefundRequest {

    @NotNull(message = "O valor do estorno é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor do estorno deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "O estorno deve ter no máximo duas casas decimais.")
    private BigDecimal amount;
}
