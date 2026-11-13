package br.com.aurora.features.auth.login;

import br.com.aurora.shared.domain.AuthSessionRepository;
import br.com.aurora.shared.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class LogoutService {

    private final AuthSessionRepository authSessionRepository;

    @Transactional
    public void logout(UsuarioAutenticado user) {
        if (user.getSessionId() != null) {
            authSessionRepository.revoke(user.getSessionId(), user.getId(), LocalDateTime.now());
        }
    }
}
