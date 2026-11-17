package br.com.aurora.features.familymanagement.invitedependent;

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
import br.com.aurora.shared.security.UsuarioAutenticado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@SpringBootTest
@Transactional
class InviteDependentServiceTest {

    @Autowired private InviteDependentService service;
    @Autowired private UserRepository userRepository;
    @Autowired private FamilyGroupRepository familyGroupRepository;
    @Autowired private FamilyInviteRepository familyInviteRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @MockitoBean
    private EmailSender emailSender;

    @SuppressWarnings("null")
    @Test
    void principalCanInviteDependent() {
        User principal = createUser(Role.PRINCIPAL, "invite-principal@aurora.com", null);

        InviteDependentResponse response = service.inviteDependent(
                UsuarioAutenticado.fromUser(principal),
                InviteDependentRequest.builder().email("new-dependent@aurora.com").build()
        );

        assertThat(response.getStatus()).isEqualTo(FamilyInviteStatus.PENDENTE);
        assertThat(familyInviteRepository.findById(response.getInviteId()))
                .map(FamilyInvite::getStatus)
                .contains(FamilyInviteStatus.PENDENTE);
        ArgumentCaptor<String> inviteLink = ArgumentCaptor.forClass(String.class);
        verify(emailSender).sendFamilyInvite(eq("new-dependent@aurora.com"), inviteLink.capture());
        assertThat(inviteLink.getValue()).startsWith("http://localhost:5173/family-invite#token=");
    }

    @Test
    void dependentCannotInviteAnotherMember() {
        User principal = createUser(Role.PRINCIPAL, "invite-owner@aurora.com", null);
        User dependent = createUser(Role.DEPENDENTE, "invite-dependent@aurora.com", principal.getFamilyGroup());

        assertThatThrownBy(() -> service.inviteDependent(
                UsuarioAutenticado.fromUser(dependent),
                InviteDependentRequest.builder().email("another@aurora.com").build()
        )).isInstanceOf(AccessDeniedException.class);
    }

    private User createUser(Role role, String email, FamilyGroup familyGroup) {
        FamilyGroup group = familyGroup != null ? familyGroup : familyGroupRepository.save(FamilyGroup.builder().build());
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
