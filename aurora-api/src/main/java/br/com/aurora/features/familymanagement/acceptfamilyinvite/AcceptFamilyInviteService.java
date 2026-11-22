package br.com.aurora.features.familymanagement.acceptfamilyinvite;

import br.com.aurora.shared.domain.FamilyInvite;
import br.com.aurora.shared.domain.FamilyInviteRepository;
import br.com.aurora.shared.domain.FamilyInviteStatus;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.TokenHashUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AcceptFamilyInviteService {

    private final UserRepository userRepository;
    private final FamilyInviteRepository familyInviteRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(noRollbackFor = ValidationException.class)
    public AcceptFamilyInviteResponse acceptInvite(AcceptFamilyInviteRequest request) {
        if (!request.getPassword().equals(request.getPasswordConfirmation())) {
            throw new ValidationException("A confirmação de senha não confere.");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        FamilyInvite invite = familyInviteRepository.findByTokenHash(TokenHashUtils.hashToken(request.getToken().trim()))
                .orElseThrow(() -> new ValidationException("O convite informado é inválido ou não existe."));

        if (!normalizedEmail.equalsIgnoreCase(invite.getInvitedEmail())) {
            throw new ValidationException("O e-mail informado não corresponde ao convite.");
        }
        if (invite.getStatus() != FamilyInviteStatus.PENDENTE) {
            throw new ValidationException("O convite não está mais disponível para uso.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (!invite.getExpiresAt().isAfter(now)) {
            invite.setStatus(FamilyInviteStatus.EXPIRADO);
            invite.setInvalidatedAt(now);
            familyInviteRepository.save(invite);
            throw new ValidationException("O convite expirou e não pode mais ser utilizado.");
        }
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ValidationException("Já existe um usuário cadastrado com este e-mail.");
        }

        User dependent = userRepository.save(User.builder()
                .familyGroup(invite.getFamilyGroup())
                .name(request.getName().trim())
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.DEPENDENTE)
                .status(UserStatus.ATIVO)
                .emailConfirmed(true)
                .build());

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
}
