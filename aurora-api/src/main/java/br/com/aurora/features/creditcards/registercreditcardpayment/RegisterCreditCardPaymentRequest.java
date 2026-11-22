package br.com.aurora.features.creditcards.registercreditcardpayment;

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
public class RegisterCreditCardPaymentRequest {

    @NotNull(message = "O valor do pagamento é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor do pagamento deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "O pagamento deve ter no máximo duas casas decimais.")
    private BigDecimal amount;
}
