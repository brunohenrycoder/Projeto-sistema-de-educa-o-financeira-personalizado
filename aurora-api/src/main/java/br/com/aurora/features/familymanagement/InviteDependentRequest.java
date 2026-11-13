package br.com.aurora.features.familymanagement;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
public class InviteDependentRequest {

    @NotBlank(message = "O e-mail do dependente é obrigatório.")
    @Email(message = "O e-mail informado é inválido.")
    private String email;
}
