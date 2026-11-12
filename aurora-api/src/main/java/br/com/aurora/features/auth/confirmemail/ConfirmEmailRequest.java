package br.com.aurora.features.auth.confirmemail;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmEmailRequest {

    @NotBlank(message = "O token de confirmação é obrigatório.")
    private String token;
}
