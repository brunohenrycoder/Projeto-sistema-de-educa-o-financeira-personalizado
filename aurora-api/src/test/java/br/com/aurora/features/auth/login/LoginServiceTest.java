package br.com.aurora.features.auth.login;

import br.com.aurora.shared.domain.AuthSession;
import br.com.aurora.shared.domain.AuthSessionRepository;
import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.LoginAttempt;
import br.com.aurora.shared.domain.LoginAttemptRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.error.AccountTemporarilyLockedException;
import br.com.aurora.shared.error.InvalidCredentialsException;
import br.com.aurora.shared.security.JwtTokenService;
import br.com.aurora.shared.security.TokenHashUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoginServiceTest {

    private static final String EMAIL = "principal@example.com";
    private static final String PASSWORD = "senhaForte123";

    @Mock
    private UserRepository userRepository;

    @Mock
    private LoginAttemptRepository loginAttemptRepository;

    @Mock
    private AuthSessionRepository authSessionRepository;

    @Mock
    private JwtTokenService jwtTokenService;

    private LoginService loginService;
    private LoginAttempt attempt;
    private User user;
    private BCryptPasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        loginService = new LoginService(
                userRepository,
                loginAttemptRepository,
                authSessionRepository,
                passwordEncoder,
                jwtTokenService
        );
        ReflectionTestUtils.setField(loginService, "tokenExpirationMs", 3_600_000L);
        loginService.initializeDummyPasswordHash();

        attempt = LoginAttempt.builder()
                .emailHash(TokenHashUtils.hashIdentifier(EMAIL))
                .failedAttempts(0)
                .build();
        user = User.builder()
                .id(UUID.randomUUID())
                .familyGroup(FamilyGroup.builder().id(UUID.randomUUID()).build())
                .name("Principal")
                .email(EMAIL)
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .role(Role.PRINCIPAL)
                .status(UserStatus.ATIVO)
                .emailConfirmed(true)
                .build();

        when(loginAttemptRepository.findByEmailHash(attempt.getEmailHash()))
                .thenReturn(Optional.of(attempt));
        lenient().when(authSessionRepository.save(any(AuthSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(jwtTokenService.generateToken(any(), any(), any(), any())).thenReturn("jwt-token");
    }

    @Test
    void createsPersistedSessionForValidCredentials() {
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));

        LoginResponse response = loginService.login(new LoginRequest(EMAIL, PASSWORD));

        assertThat(response.getAccessToken()).isEqualTo("jwt-token");
        assertThat(response.getRole()).isEqualTo(Role.PRINCIPAL);
        assertThat(response.getExpiresIn()).isEqualTo(3600);
        assertThat(attempt.getFailedAttempts()).isZero();
        ArgumentCaptor<AuthSession> sessionCaptor = ArgumentCaptor.forClass(AuthSession.class);
        verify(authSessionRepository).save(sessionCaptor.capture());
        assertThat(sessionCaptor.getValue().getUser()).isSameAs(user);
        assertThat(sessionCaptor.getValue().getExpiresAt()).isAfter(LocalDateTime.now());
    }

    @Test
    void locksOnFifthFailureAndDoesNotCountRequestsWhileLocked() {
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));

        for (int failure = 1; failure < 5; failure++) {
            assertThatThrownBy(() -> loginService.login(new LoginRequest(EMAIL, "senhaErrada")))
                    .isInstanceOf(InvalidCredentialsException.class);
        }
        assertThatThrownBy(() -> loginService.login(new LoginRequest(EMAIL, "senhaErrada")))
                .isInstanceOf(AccountTemporarilyLockedException.class);

        LocalDateTime lockedUntil = attempt.getLockedUntil();
        assertThat(attempt.getFailedAttempts()).isEqualTo(5);
        assertThat(lockedUntil).isAfter(LocalDateTime.now().plusMinutes(14));

        clearInvocations(userRepository);
        assertThatThrownBy(() -> loginService.login(new LoginRequest(EMAIL, PASSWORD)))
                .isInstanceOf(AccountTemporarilyLockedException.class);
        assertThat(attempt.getFailedAttempts()).isEqualTo(5);
        verify(userRepository, never()).findByEmailIgnoreCase(anyString());
    }

    @Test
    void resetsFailuresAfterLockExpiresAndThenAllowsSuccessfulLogin() {
        attempt.setFailedAttempts(5);
        attempt.setLastFailedAt(LocalDateTime.now().minusMinutes(16));
        attempt.setLockedUntil(LocalDateTime.now().minusMinutes(1));
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));

        LoginResponse response = loginService.login(new LoginRequest(EMAIL, PASSWORD));

        assertThat(response.getAccessToken()).isEqualTo("jwt-token");
        assertThat(attempt.getFailedAttempts()).isZero();
        assertThat(attempt.getLastFailedAt()).isNull();
        assertThat(attempt.getLockedUntil()).isNull();
    }

    @Test
    void rejectsUnconfirmedOrRemovedUsersWithoutCreatingSession() {
        user.setEmailConfirmed(false);
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> loginService.login(new LoginRequest(EMAIL, PASSWORD)))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("E-mail ou senha inválidos.");
        verify(authSessionRepository, never()).save(any(AuthSession.class));
    }
}
