package br.com.aurora.features.creditcards.createcreditcard;

import br.com.aurora.shared.domain.CreditCardNetwork;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
public class CreateCreditCardRequest {

    @NotBlank(message = "O nome do cartão é obrigatório.")
    @Size(max = 100, message = "O nome do cartão deve ter no máximo 100 caracteres.")
    private String name;

    @NotBlank(message = "O banco emissor é obrigatório.")
    @Size(max = 100, message = "O banco emissor deve ter no máximo 100 caracteres.")
    private String issuer;

    @NotNull(message = "A bandeira é obrigatória.")
    private CreditCardNetwork network;

    @Size(min = 2, max = 40, message = "A identificação da bandeira deve ter de 2 a 40 caracteres.")
    private String otherNetworkName;

    @Pattern(regexp = "\\d{4}", message = "Informe exatamente os quatro últimos números do cartão.")
    private String lastFourDigits;

    @NotNull(message = "O limite total é obrigatório.")
    @DecimalMin(value = "0.01", message = "O limite total deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "O limite deve ter no máximo duas casas decimais.")
    private BigDecimal totalLimit;

    @NotNull(message = "O dia de fechamento é obrigatório.")
    @Min(value = 1, message = "O dia de fechamento deve estar entre 1 e 28.")
    @Max(value = 28, message = "O dia de fechamento deve estar entre 1 e 28.")
    private Integer closingDay;

    @NotNull(message = "O dia de vencimento é obrigatório.")
    @Min(value = 1, message = "O dia de vencimento deve estar entre 1 e 28.")
    @Max(value = 28, message = "O dia de vencimento deve estar entre 1 e 28.")
    private Integer dueDay;
}
