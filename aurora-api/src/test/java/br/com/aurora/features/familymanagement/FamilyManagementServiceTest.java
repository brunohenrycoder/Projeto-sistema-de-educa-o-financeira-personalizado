package br.com.aurora.features.familymanagement;

import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.FamilyInvite;
import br.com.aurora.shared.domain.FamilyInviteRepository;
import br.com.aurora.shared.domain.FamilyInviteStatus;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.email.EmailSender;
import br.com.aurora.shared.security.TokenHashUtils;
import br.com.aurora.shared.security.UsuarioAutenticado;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class FamilyManagementServiceTest {

    @Autowired
    private FamilyManagementService familyManagementService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FamilyGroupRepository familyGroupRepository;

    @Autowired
    private FamilyInviteRepository familyInviteRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private EmailSender emailSender;

    @Test
    @DisplayName("Deve permitir que o principal convide um dependente")
    void shouldAllowPrincipalToInviteDependent() {
        User principal = createUser(Role.PRINCIPAL, "principal@aurora.com");

        InviteDependentResponse response = familyManagementService.inviteDependent(
                UsuarioAutenticado.fromUser(principal),
                InviteDependentRequest.builder().email("dependente@aurora.com").build()
        );

        assertThat(response.getFamilyGroupId()).isEqualTo(principal.getFamilyGroup().getId());
        assertThat(response.getInvitedEmail()).isEqualTo("dependente@aurora.com");
        assertThat(response.getStatus()).isEqualTo(FamilyInviteStatus.PENDENTE);

        FamilyInvite invite = familyInviteRepository.findById(response.getInviteId()).orElseThrow();
        assertThat(invite.getStatus()).isEqualTo(FamilyInviteStatus.PENDENTE);
    }

    @Test
    @DisplayName("Deve bloquear que dependente invide outros membros")
    void shouldBlockDependentFromInvitingOthers() {
        User principal = createUser(Role.PRINCIPAL, "principal2@aurora.com");
        User dependent = createUser(Role.DEPENDENTE, "dependente2@aurora.com", principal.getFamilyGroup());

        assertThatThrownBy(() -> familyManagementService.inviteDependent(
                UsuarioAutenticado.fromUser(dependent),
                InviteDependentRequest.builder().email("novo@aurora.com").build()
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Deve aceitar um convite e criar o dependente no grupo correto")
    void shouldAcceptInviteAndCreateDependent() {
        User principal = createUser(Role.PRINCIPAL, "principal3@aurora.com");
        familyManagementService.inviteDependent(
                UsuarioAutenticado.fromUser(principal),
                InviteDependentRequest.builder().email("aceito@aurora.com").build()
        );

        String rawToken = "real-invite-token-123";
        FamilyInvite invite = FamilyInvite.builder()
                .familyGroup(principal.getFamilyGroup())
                .createdBy(principal)
                .invitedEmail("aceito@aurora.com")
                .tokenHash(TokenHashUtils.hashToken(rawToken))
                .status(FamilyInviteStatus.PENDENTE)
                .createdAt(java.time.LocalDateTime.now())
                .expiresAt(java.time.LocalDateTime.now().plusHours(48))
                .build();
        familyInviteRepository.save(invite);

        AcceptFamilyInviteResponse accepted = familyManagementService.acceptInvite(
                AcceptFamilyInviteRequest.builder()
                        .token(rawToken)
                        .email("aceito@aurora.com")
                        .name("Novo Dependente")
                        .password("senhaForte123")
                        .passwordConfirmation("senhaForte123")
                        .build()
        );

        assertThat(accepted.getRole()).isEqualTo(Role.DEPENDENTE);
        assertThat(accepted.getFamilyGroupId()).isEqualTo(principal.getFamilyGroup().getId());
        assertThat(userRepository.findByEmailIgnoreCase("aceito@aurora.com")).isPresent();

        FamilyInvite updatedInvite = familyInviteRepository.findById(invite.getId()).orElseThrow();
        assertThat(updatedInvite.getStatus()).isEqualTo(FamilyInviteStatus.ACEITO);
    }

    private User createUser(Role role, String email) {
        return createUser(role, email, null);
    }

    private User createUser(Role role, String email, FamilyGroup familyGroup) {
        FamilyGroup group = familyGroup != null ? familyGroup : familyGroupRepository.save(FamilyGroup.builder().build());

        User user = User.builder()
                .familyGroup(group)
                .name(role == Role.PRINCIPAL ? "Principal" : "Dependente")
                .email(email)
                .passwordHash(passwordEncoder.encode("senhaForte123"))
                .role(role)
                .status(UserStatus.ATIVO)
                .emailConfirmed(true)
                .build();

        return userRepository.save(user);
    }
}
