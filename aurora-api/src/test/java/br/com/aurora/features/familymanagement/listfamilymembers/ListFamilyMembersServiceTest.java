package br.com.aurora.features.familymanagement.listfamilymembers;

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
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ListFamilyMembersServiceTest {

    @Autowired private ListFamilyMembersService service;
    @Autowired private UserRepository userRepository;
    @Autowired private FamilyGroupRepository familyGroupRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private MockMvc mockMvc;

    @Test
    void principalCanListMembersButDependentCannot() {
        User principal = createUser(Role.PRINCIPAL, "members-principal@aurora.com", null);
        createUser(Role.DEPENDENTE, "members-dependent@aurora.com", principal.getFamilyGroup());

        assertThat(service.listMembers(UsuarioAutenticado.fromUser(principal))).hasSize(2);
        User dependent = userRepository.findByEmailIgnoreCase("members-dependent@aurora.com").orElseThrow();
        assertThatThrownBy(() -> service.listMembers(UsuarioAutenticado.fromUser(dependent)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void endpointRejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/api/familymanagement/members"))
                .andExpect(status().isUnauthorized());
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
