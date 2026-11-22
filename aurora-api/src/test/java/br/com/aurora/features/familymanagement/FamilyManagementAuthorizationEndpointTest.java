package br.com.aurora.features.familymanagement;

import br.com.aurora.features.familymanagement.invitedependent.InviteDependentRequest;
import br.com.aurora.features.familymanagement.updatemember.UpdateMemberRequest;
import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.FamilyInviteRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.security.UsuarioAutenticado;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FamilyManagementAuthorizationEndpointTest {

    private static final String BASE = "/api/familymanagement";
    private static final String MEMBERS = BASE + "/members";
    private static final String INVITE = BASE + "/invite";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private FamilyGroupRepository familyGroupRepository;
    @Autowired private FamilyInviteRepository familyInviteRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("DEPENDENTE recebe 403 em GET /members (somente PRINCIPAL)")
    void dependentCannotListMembers() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "auth-list-principal", null);
        User dependent = createUser(Role.DEPENDENTE, "auth-list-dependent", principal.getFamilyGroup());

        mockMvc.perform(get(MEMBERS).with(user(UsuarioAutenticado.fromUser(dependent))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        assertThat(userRepository.findByEmailIgnoreCase(principal.getEmail())).isPresent();
        assertThat(userRepository.findByEmailIgnoreCase(dependent.getEmail())).isPresent();
    }

    @Test
    @DisplayName("DEPENDENTE recebe 403 em POST /invite e nenhum convite é criado")
    void dependentCannotInvite() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "auth-invite-principal", null);
        User dependent = createUser(Role.DEPENDENTE, "auth-invite-dependent", principal.getFamilyGroup());
        String invitedEmail = "auth-invite-target-" + UUID.randomUUID() + "@aurora.com";
        long invitesBefore = familyInviteRepository.count();

        String payload = objectMapper.writeValueAsString(
                InviteDependentRequest.builder().email(invitedEmail).build());

        mockMvc.perform(post(INVITE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .with(user(UsuarioAutenticado.fromUser(dependent))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        assertThat(familyInviteRepository.count()).isEqualTo(invitesBefore);
        assertThat(familyInviteRepository.findAll())
                .noneSatisfy(invite -> assertThat(invite.getInvitedEmail()).isEqualTo(invitedEmail));
    }

    @Test
    @DisplayName("DEPENDENTE recebe 403 em PUT /members/{id} e o integrante permanece inalterado")
    void dependentCannotUpdateMember() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "auth-update-principal", null);
        User dependent = createUser(Role.DEPENDENTE, "auth-update-dependent", principal.getFamilyGroup());
        User target = createUser(Role.DEPENDENTE, "auth-update-target", principal.getFamilyGroup());
        String originalName = target.getName();
        String originalEmail = target.getEmail();
        String newEmail = "auth-update-new-" + UUID.randomUUID() + "@aurora.com";

        String payload = objectMapper.writeValueAsString(UpdateMemberRequest.builder()
                .name("Nome Alterado Indevidamente")
                .email(newEmail)
                .build());

        mockMvc.perform(put(MEMBERS + "/" + target.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .with(user(UsuarioAutenticado.fromUser(dependent))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        User persisted = userRepository.findById(target.getId()).orElseThrow();
        assertThat(persisted.getName()).isEqualTo(originalName);
        assertThat(persisted.getEmail()).isEqualTo(originalEmail);
        assertThat(userRepository.findByEmailIgnoreCase(newEmail)).isEmpty();
    }

    @Test
    @DisplayName("DEPENDENTE recebe 403 em DELETE /members/{id} e o integrante permanece ATIVO")
    void dependentCannotRemoveMember() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "auth-remove-principal", null);
        User dependent = createUser(Role.DEPENDENTE, "auth-remove-dependent", principal.getFamilyGroup());
        User target = createUser(Role.DEPENDENTE, "auth-remove-target", principal.getFamilyGroup());

        mockMvc.perform(delete(MEMBERS + "/" + target.getId())
                        .with(user(UsuarioAutenticado.fromUser(dependent))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        User persisted = userRepository.findById(target.getId()).orElseThrow();
        assertThat(persisted.getStatus()).isEqualTo(UserStatus.ATIVO);
        assertThat(persisted.getFamilyGroup().getId()).isEqualTo(principal.getFamilyGroup().getId());
    }

    private User createUser(Role role, String prefix, FamilyGroup familyGroup) {
        FamilyGroup group = familyGroup != null
                ? familyGroup
                : familyGroupRepository.save(FamilyGroup.builder().build());
        String suffix = UUID.randomUUID().toString();
        return userRepository.save(User.builder()
                .familyGroup(group)
                .name(role == Role.PRINCIPAL ? "Principal" : "Dependente")
                .email(prefix + "-" + suffix + "@aurora.com")
                .passwordHash(passwordEncoder.encode("senhaForte123"))
                .role(role)
                .status(UserStatus.ATIVO)
                .emailConfirmed(true)
                .build());
    }
}
