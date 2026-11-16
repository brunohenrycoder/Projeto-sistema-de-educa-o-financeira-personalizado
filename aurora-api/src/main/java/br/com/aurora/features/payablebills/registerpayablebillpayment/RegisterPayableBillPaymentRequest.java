package br.com.aurora.features.payablebills.registerpayablebillpayment;

import br.com.aurora.shared.domain.ExpensePaymentMethod;
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
public class RegisterPayableBillPaymentRequest {

    @NotNull(message = "A data do pagamento é obrigatória.")
    private LocalDate paymentDate;

    @NotNull(message = "O método de pagamento é obrigatório.")
    private ExpensePaymentMethod paymentMethod;

    @DecimalMin(value = "0.01", message = "O valor pago deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "O valor pago deve ter no máximo duas casas decimais.")
    private BigDecimal amount;
}
