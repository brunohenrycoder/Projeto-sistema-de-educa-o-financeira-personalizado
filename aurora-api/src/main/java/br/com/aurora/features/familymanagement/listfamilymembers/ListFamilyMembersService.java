package br.com.aurora.features.familymanagement.listfamilymembers;

import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ListFamilyMembersService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ListFamilyMembersResponse> listMembers(UsuarioAutenticado authenticatedUser) {
        User principal = findPrincipal(authenticatedUser);
        return userRepository.findByFamilyGroupIdAndStatusOrderByNameAsc(
                        principal.getFamilyGroup().getId(),
                        UserStatus.ATIVO
                )
                .stream()
                .map(this::toResponse)
                .toList();
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

    private ListFamilyMembersResponse toResponse(User user) {
        return ListFamilyMembersResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
