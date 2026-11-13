package br.com.aurora.features.familymanagement;

import br.com.aurora.shared.domain.AuthSessionRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FamilyManagementService {

    private static final long INVITE_VALIDITY_HOURS = 48;

    private final UserRepository userRepository;
    private final FamilyInviteRepository familyInviteRepository;
    private final AuthSessionRepository authSessionRepository;
    private final EmailSender emailSender;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.family-invite-url:http://localhost:3000/family-invite}")
    private String familyInviteUrl;

    @Transactional
    public InviteDependentResponse inviteDependent(UsuarioAutenticado authenticatedUser, InviteDependentRequest request) {
        User principal = findActiveUser(authenticatedUser.getId());
        requirePrincipal(principal);

        String normalizedEmail = normalizeEmail(request.getEmail());
        if (normalizedEmail.equalsIgnoreCase(principal.getEmail())) {
            throw new ValidationException("O principal não pode convidar a si mesmo.");
        }

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ValidationException("Já existe um usuário cadastrado com este e-mail.");
        }

        invalidatePreviousPendingInvites(principal.getFamilyGroup(), normalizedEmail);

        String rawToken = TokenHashUtils.generateRandomToken();
        FamilyInvite invite = FamilyInvite.builder()
                .familyGroup(principal.getFamilyGroup())
                .createdBy(principal)
                .invitedEmail(normalizedEmail)
                .tokenHash(TokenHashUtils.hashToken(rawToken))
                .status(FamilyInviteStatus.PENDENTE)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(INVITE_VALIDITY_HOURS))
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

    @Transactional
    public AcceptFamilyInviteResponse acceptInvite(AcceptFamilyInviteRequest request) {
        if (!request.getPassword().equals(request.getPasswordConfirmation())) {
            throw new ValidationException("A confirmação de senha não confere.");
        }

        if (request.getPassword().length() < 8) {
            throw new ValidationException("A senha deve ter no mínimo 8 caracteres.");
        }

        String normalizedEmail = normalizeEmail(request.getEmail());
        String rawToken = request.getToken() == null ? "" : request.getToken().trim();
        String tokenHash = TokenHashUtils.hashToken(rawToken);

        FamilyInvite invite = familyInviteRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ValidationException("O convite informado é inválido ou não existe."));

        if (!normalizedEmail.equalsIgnoreCase(invite.getInvitedEmail())) {
            throw new ValidationException("O e-mail informado não corresponde ao convite.");
        }

        if (invite.getStatus() != FamilyInviteStatus.PENDENTE) {
            throw new ValidationException("O convite não está mais disponível para uso.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (invite.getExpiresAt().isBefore(now) || invite.getExpiresAt().isEqual(now)) {
            invite.setStatus(FamilyInviteStatus.EXPIRADO);
            invite.setInvalidatedAt(now);
            familyInviteRepository.save(invite);
            throw new ValidationException("O convite expirou e não pode mais ser utilizado.");
        }

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ValidationException("Já existe um usuário cadastrado com este e-mail.");
        }

        User dependent = User.builder()
                .familyGroup(invite.getFamilyGroup())
                .name(request.getName().trim())
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.DEPENDENTE)
                .status(UserStatus.ATIVO)
                .emailConfirmed(true)
                .build();

        dependent = userRepository.save(dependent);

        invite.setStatus(FamilyInviteStatus.ACEITO);
        invite.setAcceptedAt(now);
        invite.setAcceptedBy(dependent);
        invite.setInvalidatedAt(now);
        familyInviteRepository.save(invite);

        return AcceptFamilyInviteResponse.builder()
                .userId(dependent.getId())
                .familyGroupId(invite.getFamilyGroup().getId())
                .name(dependent.getName())
                .email(dependent.getEmail())
                .role(dependent.getRole())
                .status(dependent.getStatus())
                .createdAt(dependent.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<FamilyMemberResponse> listMembers(UsuarioAutenticado authenticatedUser) {
        User principal = findActiveUser(authenticatedUser.getId());
        requirePrincipal(principal);

        return userRepository.findByFamilyGroupIdAndStatusOrderByNameAsc(principal.getFamilyGroup().getId(), UserStatus.ATIVO)
                .stream()
                .map(this::toMemberResponse)
                .toList();
    }

    @Transactional
    public FamilyMemberResponse updateMember(UsuarioAutenticado authenticatedUser, UUID memberId, UpdateMemberRequest request) {
        User principal = findActiveUser(authenticatedUser.getId());
        requirePrincipal(principal);

        User member = userRepository.findByIdAndFamilyGroupId(memberId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Integrante não encontrado no grupo familiar."));

        if (request.getName() != null && !request.getName().isBlank()) {
            String trimmedName = request.getName().trim();
            if (trimmedName.length() < 3) {
                throw new ValidationException("O nome deve ter no mínimo 3 caracteres.");
            }
            member.setName(trimmedName);
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String normalizedEmail = normalizeEmail(request.getEmail());
            if (!normalizedEmail.equalsIgnoreCase(member.getEmail()) && userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
                throw new ValidationException("Já existe um usuário cadastrado com este e-mail.");
            }
            member.setEmail(normalizedEmail);
        }

        userRepository.save(member);
        return toMemberResponse(member);
    }

    @Transactional
    public void removeMember(UsuarioAutenticado authenticatedUser, UUID memberId) {
        User principal = findActiveUser(authenticatedUser.getId());
        requirePrincipal(principal);

        User member = userRepository.findByIdAndFamilyGroupId(memberId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Integrante não encontrado no grupo familiar."));

        if (member.getId().equals(principal.getId())) {
            throw new ValidationException("O principal não pode remover a si mesmo do grupo familiar.");
        }

        if (member.getStatus() != UserStatus.ATIVO) {
            throw new ValidationException("Este integrante já está removido ou inativo.");
        }

        member.setStatus(UserStatus.REMOVIDO);
        userRepository.save(member);
        authSessionRepository.revokeAllActiveByUserId(member.getId(), LocalDateTime.now());
    }

    private void requirePrincipal(User user) {
        if (user.getRole() != Role.PRINCIPAL) {
            throw new AccessDeniedException("Somente o principal pode administrar o grupo familiar.");
        }
        if (user.getStatus() != UserStatus.ATIVO || !user.isEmailConfirmed()) {
            throw new AccessDeniedException("O usuário não está ativo para essa operação.");
        }
    }

    private User findActiveUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));
    }

    private void invalidatePreviousPendingInvites(FamilyGroup familyGroup, String normalizedEmail) {
        List<FamilyInvite> pendingInvites = familyInviteRepository.findByFamilyGroupIdAndInvitedEmailAndStatusIn(
                familyGroup.getId(),
                normalizedEmail,
                List.of(FamilyInviteStatus.PENDENTE)
        );

        LocalDateTime now = LocalDateTime.now();
        for (FamilyInvite invite : pendingInvites) {
            invite.setStatus(FamilyInviteStatus.INVALIDADO);
            invite.setInvalidatedAt(now);
            familyInviteRepository.save(invite);
        }
    }

    private FamilyMemberResponse toMemberResponse(User user) {
        return FamilyMemberResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private String normalizeEmail(String value) {
        if (value == null) {
            throw new ValidationException("O e-mail não pode ser nulo.");
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
