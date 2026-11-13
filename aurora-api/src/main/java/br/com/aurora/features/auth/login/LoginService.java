package br.com.aurora.features.auth.login;

import br.com.aurora.shared.domain.AuthSession;
import br.com.aurora.shared.domain.AuthSessionRepository;
import br.com.aurora.shared.domain.LoginAttempt;
import br.com.aurora.shared.domain.LoginAttemptRepository;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.error.AccountTemporarilyLockedException;
import br.com.aurora.shared.error.InvalidCredentialsException;
import br.com.aurora.shared.security.JwtTokenService;
import br.com.aurora.shared.security.TokenHashUtils;
import br.com.aurora.shared.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.time.ZoneId;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LoginService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_DURATION_MINUTES = 15;
    private static final String INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha inválidos.";

    private final UserRepository userRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;

    @Value("${security.jwt.expiration:86400000}")
    private long tokenExpirationMs;

    private String dummyPasswordHash;

    @PostConstruct
    void initializeDummyPasswordHash() {
        dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional(noRollbackFor = {
            InvalidCredentialsException.class,
            AccountTemporarilyLockedException.class
    })
    public LoginResponse login(LoginRequest request) {
        LocalDateTime now = LocalDateTime.now();
        authSessionRepository.deleteExpiredOrRevoked(now);

        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        String emailHash = TokenHashUtils.hashIdentifier(normalizedEmail);
        loginAttemptRepository.createIfMissing(emailHash);

        LoginAttempt attempt = loginAttemptRepository.findByEmailHash(emailHash)
                .orElseThrow(() -> new IllegalStateException("Registro de tentativas de login não foi criado."));

        if (attempt.getLockedUntil() != null && attempt.getLockedUntil().isAfter(now)) {
            throw new AccountTemporarilyLockedException(attempt.getLockedUntil());
        }
        if (attempt.getLockedUntil() != null) {
            attempt.setFailedAttempts(0);
            attempt.setLockedUntil(null);
            attempt.setLastFailedAt(null);
        }

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        String storedPasswordHash = user == null ? dummyPasswordHash : user.getPasswordHash();
        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), storedPasswordHash);

        if (user == null || !passwordMatches
                || user.getStatus() != UserStatus.ATIVO
                || !user.isEmailConfirmed()) {
            recordFailure(attempt, now);
            throw failureFor(attempt);
        }

        attempt.setFailedAttempts(0);
        attempt.setLastFailedAt(null);
        attempt.setLockedUntil(null);
        loginAttemptRepository.save(attempt);

        UUID sessionId = UUID.randomUUID();
        Date issuedAt = new Date();
        Date jwtExpiresAt = new Date(issuedAt.getTime() + tokenExpirationMs);
        LocalDateTime sessionExpiresAt = LocalDateTime.ofInstant(jwtExpiresAt.toInstant(), ZoneId.systemDefault());
        authSessionRepository.save(AuthSession.builder()
                .id(sessionId)
                .user(user)
                .createdAt(now)
                .expiresAt(sessionExpiresAt)
                .build());

        UsuarioAutenticado authenticatedUser = UsuarioAutenticado.fromUser(user, sessionId);
        String token = jwtTokenService.generateToken(authenticatedUser, sessionId, issuedAt, jwtExpiresAt);
        return LoginResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(tokenExpirationMs / 1000)
                .userId(user.getId())
                .familyGroupId(user.getFamilyGroup().getId())
                .role(user.getRole())
                .build();
    }

    private void recordFailure(LoginAttempt attempt, LocalDateTime now) {
        attempt.setFailedAttempts(attempt.getFailedAttempts() + 1);
        attempt.setLastFailedAt(now);
        if (attempt.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            attempt.setLockedUntil(now.plusMinutes(LOCK_DURATION_MINUTES));
        }
        loginAttemptRepository.save(attempt);
    }

    private RuntimeException failureFor(LoginAttempt attempt) {
        if (attempt.getLockedUntil() != null) {
            return new AccountTemporarilyLockedException(attempt.getLockedUntil());
        }
        return new InvalidCredentialsException(INVALID_CREDENTIALS_MESSAGE);
    }
}
