package br.com.aurora.features.receivables.cancelreceivable;

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
public class CancelReceivableRequest {

    @NotNull(message = "O alcance do cancelamento é obrigatório.")
    private CancellationScope scope;
}
