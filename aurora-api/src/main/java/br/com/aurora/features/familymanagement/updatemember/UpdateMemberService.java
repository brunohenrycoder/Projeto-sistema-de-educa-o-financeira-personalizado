package br.com.aurora.features.familymanagement.updatemember;

import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UpdateMemberService {

    private final UserRepository userRepository;

    @Transactional
    public UpdateMemberResponse updateMember(
            UsuarioAutenticado authenticatedUser,
            UUID memberId,
            UpdateMemberRequest request
    ) {
        User principal = findPrincipal(authenticatedUser);
        User member = userRepository.findByIdAndFamilyGroupId(memberId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Integrante não encontrado no grupo familiar."));

        if (request.getName() != null && !request.getName().isBlank()) {
            String name = request.getName().trim();
            if (name.length() < 3) {
                throw new ValidationException("O nome deve ter no mínimo 3 caracteres.");
            }
            member.setName(name);
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
            if (!email.equalsIgnoreCase(member.getEmail()) && userRepository.existsByEmailIgnoreCase(email)) {
                throw new ValidationException("Já existe um usuário cadastrado com este e-mail.");
            }
            member.setEmail(email);
        }

        return toResponse(userRepository.save(member));
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

    private UpdateMemberResponse toResponse(User user) {
        return UpdateMemberResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
