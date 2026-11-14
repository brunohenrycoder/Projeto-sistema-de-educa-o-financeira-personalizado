package br.com.aurora.shared.security;

import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CreditCardAccess {

    private final UserRepository userRepository;

    public User requireActiveUser() {
        UsuarioAutenticado authenticatedUser = SecurityUtils.getUsuarioAutenticado()
                .orElseThrow(() -> new AccessDeniedException("Usuário não autenticado."));
        User user = userRepository.findByIdAndFamilyGroupId(
                        authenticatedUser.getId(),
                        authenticatedUser.getFamilyGroupId()
                )
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));
        if (user.getStatus() != UserStatus.ATIVO || !user.isEmailConfirmed()) {
            throw new AccessDeniedException("Usuário inativo ou sem confirmação de e-mail.");
        }
        return user;
    }

    public User requirePrincipal() {
        User user = requireActiveUser();
        if (user.getRole() != Role.PRINCIPAL) {
            throw new AccessDeniedException("Somente o Principal pode acessar esta operação.");
        }
        return user;
    }
}
