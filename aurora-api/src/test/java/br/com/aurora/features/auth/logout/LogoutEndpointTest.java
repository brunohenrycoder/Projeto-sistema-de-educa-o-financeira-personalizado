package br.com.aurora.features.auth.logout;

import br.com.aurora.features.auth.login.LoginRequest;
import br.com.aurora.shared.domain.AuthSessionRepository;
import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LogoutEndpointTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private FamilyGroupRepository familyGroupRepository;
    @Autowired private AuthSessionRepository authSessionRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void logoutRevokesTokenImmediately() throws Exception {
        User user = createUser();
        String loginJson = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(user.getEmail(), "senhaForte123"))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode response = objectMapper.readTree(loginJson);
        String accessToken = response.get("accessToken").asText();

        mockMvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());
        assertThat(authSessionRepository.count()).isEqualTo(1);
    }

    private User createUser() {
        FamilyGroup familyGroup = familyGroupRepository.save(FamilyGroup.builder().build());
        return userRepository.save(User.builder()
                .familyGroup(familyGroup)
                .name("Usuário de teste")
                .email("logout-" + java.util.UUID.randomUUID() + "@example.com")
                .passwordHash(passwordEncoder.encode("senhaForte123"))
                .role(Role.PRINCIPAL)
                .status(UserStatus.ATIVO)
                .emailConfirmed(true)
                .build());
    }
}
