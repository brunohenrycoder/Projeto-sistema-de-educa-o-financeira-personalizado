package br.com.aurora.features.familymanagement.removemember;

import br.com.aurora.shared.domain.AuthSessionRepository;
import br.com.aurora.shared.domain.AuthSession;
import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.security.UsuarioAutenticado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class RemoveMemberServiceTest {

    @Autowired private RemoveMemberService service;
    @Autowired private UserRepository userRepository;
    @Autowired private FamilyGroupRepository familyGroupRepository;
    @Autowired private AuthSessionRepository authSessionRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void removalPreservesMemberAndRevokesSessions() {
        FamilyGroup group = familyGroupRepository.save(FamilyGroup.builder().build());
        User principal = createUser(Role.PRINCIPAL, "remove-principal@aurora.com", group);
        User dependent = createUser(Role.DEPENDENTE, "remove-dependent@aurora.com", group);
        UUID sessionId = UUID.randomUUID();
        authSessionRepository.save(AuthSession.builder()
                .id(sessionId)
                .user(dependent)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build());

        service.removeMember(UsuarioAutenticado.fromUser(principal), dependent.getId());

        assertThat(userRepository.findById(dependent.getId()).orElseThrow().getStatus())
                .isEqualTo(UserStatus.REMOVIDO);
        assertThat(authSessionRepository.existsByIdAndUserIdAndRevokedAtIsNullAndExpiresAtAfter(
                sessionId,
                dependent.getId(),
                LocalDateTime.now()
        )).isFalse();
    }

    private User createUser(Role role, String email, FamilyGroup group) {
        return userRepository.save(User.builder()
                .familyGroup(group)
                .name(role == Role.PRINCIPAL ? "Principal" : "Dependente")
                .email(email)
                .passwordHash(passwordEncoder.encode("senhaForte123"))
                .role(role)
                .status(UserStatus.ATIVO)
                .emailConfirmed(true)
                .build());
    }
}
