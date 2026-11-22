package br.com.aurora.features.familymanagement.removemember;

import br.com.aurora.shared.domain.AuthSessionRepository;
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

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RemoveMemberService {

    private final UserRepository userRepository;
    private final AuthSessionRepository authSessionRepository;

    @Transactional
    public void removeMember(UsuarioAutenticado authenticatedUser, UUID memberId) {
        User principal = findPrincipal(authenticatedUser);
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
}
