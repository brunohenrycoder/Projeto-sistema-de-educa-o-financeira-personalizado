package br.com.aurora.features.auth.registeruser;

import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.EmailVerificationToken;
import br.com.aurora.shared.domain.EmailVerificationTokenRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.email.EmailSender;
import br.com.aurora.shared.error.EmailAlreadyExistsException;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.TokenHashUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class RegisterUserService {

    private static final long TOKEN_VALIDITY_HOURS = 24;

    private final UserRepository userRepository;
    private final FamilyGroupRepository familyGroupRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailSender emailSender;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.email-confirmation-url}")
    private String emailConfirmationUrl;

    @Transactional
    public RegisterUserResponse execute(RegisterUserRequest request) {
        if (!request.getPassword().equals(request.getPasswordConfirmation())) {
            throw new ValidationException("A confirmação de senha não confere.");
        }

        if (request.getName().trim().length() < 3) {
            throw new ValidationException("O nome deve ter no mínimo 3 caracteres.");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new EmailAlreadyExistsException("Já existe um usuário cadastrado com este e-mail.");
        }

        FamilyGroup familyGroup = familyGroupRepository.save(FamilyGroup.builder().build());

        String passwordHash = passwordEncoder.encode(request.getPassword());

        User user = User.builder()
                .familyGroup(familyGroup)
                .name(request.getName().trim())
                .email(normalizedEmail)
                .passwordHash(passwordHash)
                .role(Role.PRINCIPAL)
                .status(UserStatus.ATIVO)
                .emailConfirmed(false)
                .build();

        user = userRepository.save(user);

        String rawToken = TokenHashUtils.generateRandomToken();
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .user(user)
                .tokenHash(TokenHashUtils.hashToken(rawToken))
                .expiresAt(LocalDateTime.now().plus(TOKEN_VALIDITY_HOURS, ChronoUnit.HOURS))
                .build();
        emailVerificationTokenRepository.save(verificationToken);

        String confirmationLink = UriComponentsBuilder.fromUriString(emailConfirmationUrl)
                .fragment("token=" + rawToken)
                .build()
                .toUriString();
        emailSender.sendEmailConfirmation(user.getEmail(), confirmationLink);

        return RegisterUserResponse.builder()
                .userId(user.getId())
                .familyGroupId(familyGroup.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
