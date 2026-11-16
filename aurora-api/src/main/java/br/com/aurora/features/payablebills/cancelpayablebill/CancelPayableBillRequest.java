package br.com.aurora.features.payablebills.cancelpayablebill;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CancelPayableBillRequest {

    @NotNull(message = "O alcance do cancelamento é obrigatório.")
    private CancelPayableBillScope scope;
}
