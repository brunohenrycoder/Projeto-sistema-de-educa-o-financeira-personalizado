package br.com.aurora.features.familymanagement.removemember;

import br.com.aurora.features.auth.login.LoginRequest;
import br.com.aurora.shared.domain.AuthSessionRepository;
import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.security.JwtTokenService;
import com.fasterxml.jackson.databind.JsonNode;
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

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RemoveMemberSessionRevocationTest {

    private static final String LOGIN_URL = "/api/auth/login";
    private static final String EXPENSES_URL = "/api/expenses";
    private static final String MEMBERS_URL = "/api/familymanagement/members";
    private static final String PASSWORD = "senhaForte123";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private FamilyGroupRepository familyGroupRepository;
    @Autowired private AuthSessionRepository authSessionRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenService jwtTokenService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Após remoção pelo Principal, o token antigo do Dependente é rejeitado por HTTP (401)")
    void removedDependentTokenIsRejectedAfterRemoval() throws Exception {
        FamilyGroup group = familyGroupRepository.save(FamilyGroup.builder().build());
        User principal = createUser(Role.PRINCIPAL, "revoke-http-principal", group);
        User dependent = createUser(Role.DEPENDENTE, "revoke-http-dependent", group);

        String dependentToken = login(dependent.getEmail());
        String principalToken = login(principal.getEmail());
        UUID dependentSessionId = jwtTokenService.extractSessionId(dependentToken);
        assertThat(dependentSessionId).isNotNull();

        // Antes da remoção: o token do Dependente acessa endpoint protegido.
        mockMvc.perform(get(EXPENSES_URL).header("Authorization", "Bearer " + dependentToken))
                .andExpect(status().isOk());
        assertThat(authSessionRepository.existsByIdAndUserIdAndRevokedAtIsNullAndExpiresAtAfter(
                dependentSessionId, dependent.getId(), LocalDateTime.now())).isTrue();

        // O Principal remove o Dependente pela operação HTTP autorizada.
        mockMvc.perform(delete(MEMBERS_URL + "/" + dependent.getId())
                        .header("Authorization", "Bearer " + principalToken))
                .andExpect(status().isNoContent());

        // O mesmo token anterior deixa de autenticar.
        mockMvc.perform(get(EXPENSES_URL).header("Authorization", "Bearer " + dependentToken))
                .andExpect(status().isUnauthorized());

        User persisted = userRepository.findById(dependent.getId()).orElseThrow();
        assertThat(persisted.getStatus()).isEqualTo(UserStatus.REMOVIDO);
        assertThat(authSessionRepository.existsByIdAndUserIdAndRevokedAtIsNullAndExpiresAtAfter(
                dependentSessionId, dependent.getId(), LocalDateTime.now())).isFalse();
    }

    private String login(String email) throws Exception {
        String body = mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, PASSWORD))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode response = objectMapper.readTree(body);
        return response.get("accessToken").asText();
    }

    private User createUser(Role role, String prefix, FamilyGroup group) {
        return userRepository.save(User.builder()
                .familyGroup(group)
                .name(role == Role.PRINCIPAL ? "Principal" : "Dependente")
                .email(prefix + "-" + UUID.randomUUID() + "@aurora.com")
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .role(role)
                .status(UserStatus.ATIVO)
                .emailConfirmed(true)
                .build());
    }
}
