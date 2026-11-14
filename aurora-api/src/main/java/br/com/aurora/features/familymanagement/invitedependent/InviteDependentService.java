package br.com.aurora.features.familymanagement.invitedependent;

import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyInvite;
import br.com.aurora.shared.domain.FamilyInviteRepository;
import br.com.aurora.shared.domain.FamilyInviteStatus;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.email.EmailSender;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.TokenHashUtils;
import br.com.aurora.shared.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class InviteDependentService {

    private static final long INVITE_VALIDITY_HOURS = 48;

    private final UserRepository userRepository;
    private final FamilyInviteRepository familyInviteRepository;
    private final EmailSender emailSender;

    @Value("${app.family-invite-url:http://localhost:3000/family-invite}")
    private String familyInviteUrl;

    @Transactional
    public InviteDependentResponse inviteDependent(UsuarioAutenticado authenticatedUser, InviteDependentRequest request) {
        User principal = findPrincipal(authenticatedUser);
        String normalizedEmail = normalizeEmail(request.getEmail());

        if (normalizedEmail.equalsIgnoreCase(principal.getEmail())) {
            throw new ValidationException("O principal não pode convidar a si mesmo.");
        }
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ValidationException("Já existe um usuário cadastrado com este e-mail.");
        }

        invalidatePreviousPendingInvites(principal.getFamilyGroup(), normalizedEmail);

        LocalDateTime now = LocalDateTime.now();
        String rawToken = TokenHashUtils.generateRandomToken();
        FamilyInvite invite = FamilyInvite.builder()
                .familyGroup(principal.getFamilyGroup())
                .createdBy(principal)
                .invitedEmail(normalizedEmail)
                .tokenHash(TokenHashUtils.hashToken(rawToken))
                .status(FamilyInviteStatus.PENDENTE)
                .createdAt(now)
                .expiresAt(now.plusHours(INVITE_VALIDITY_HOURS))
                .build();
        familyInviteRepository.save(invite);

        String inviteLink = UriComponentsBuilder.fromUriString(familyInviteUrl)
                .fragment("token=" + rawToken)
                .build()
                .toUriString();
        emailSender.sendFamilyInvite(normalizedEmail, inviteLink);

        return InviteDependentResponse.builder()
                .inviteId(invite.getId())
                .familyGroupId(principal.getFamilyGroup().getId())
                .invitedEmail(invite.getInvitedEmail())
                .status(invite.getStatus())
                .createdAt(invite.getCreatedAt())
                .expiresAt(invite.getExpiresAt())
                .build();
    }

    private User findPrincipal(UsuarioAutenticado authenticatedUser) {
        User user = userRepository.findById(authenticatedUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));
        if (user.getRole() != Role.PRINCIPAL) {
            throw new AccessDeniedException("Somente o principal pode administrar o grupo familiar.");
        }
        if (user.getStatus() != UserStatus.ATIVO || !user.isEmailConfirmed()) {
            throw new AccessDeniedException("O usuário não está ativo para essa operação.");
        }
        return user;
    }

    private void invalidatePreviousPendingInvites(FamilyGroup familyGroup, String normalizedEmail) {
        List<FamilyInvite> pendingInvites = familyInviteRepository.findByFamilyGroupIdAndInvitedEmailAndStatusIn(
                familyGroup.getId(),
                normalizedEmail,
                List.of(FamilyInviteStatus.PENDENTE)
        );
        LocalDateTime now = LocalDateTime.now();
        pendingInvites.forEach(invite -> {
            invite.setStatus(FamilyInviteStatus.INVALIDADO);
            invite.setInvalidatedAt(now);
        });
    }

    private String normalizeEmail(String value) {
        if (value == null) {
            throw new ValidationException("O e-mail não pode ser nulo.");
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
