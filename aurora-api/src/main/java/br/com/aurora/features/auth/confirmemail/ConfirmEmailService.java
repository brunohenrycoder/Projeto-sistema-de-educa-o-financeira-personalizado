package br.com.aurora.features.auth.confirmemail;

import br.com.aurora.shared.domain.EmailVerificationToken;
import br.com.aurora.shared.domain.EmailVerificationTokenRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.TokenHashUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ConfirmEmailService {

    private static final String INVALID_TOKEN_MESSAGE =
            "O link de confirmação é inválido, expirou ou já foi utilizado.";

    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final UserRepository userRepository;

    @Transactional
    public void confirm(String rawToken) {
        String tokenHash = TokenHashUtils.hashToken(rawToken);
        EmailVerificationToken token = emailVerificationTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ValidationException(INVALID_TOKEN_MESSAGE));
        LocalDateTime now = LocalDateTime.now();

        if (!token.isValid(now) || token.getUser().getRole() != Role.PRINCIPAL) {
            throw new ValidationException(INVALID_TOKEN_MESSAGE);
        }

        User user = token.getUser();
        if (emailVerificationTokenRepository.consumeIfValid(tokenHash, now) != 1) {
            throw new ValidationException(INVALID_TOKEN_MESSAGE);
        }

        user.setEmailConfirmed(true);
        userRepository.save(user);
    }
}
