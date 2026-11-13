package br.com.aurora.features.auth.login;

import br.com.aurora.shared.domain.AuthSessionRepository;
import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.LoginAttempt;
import br.com.aurora.shared.domain.LoginAttemptRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.security.TokenHashUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LoginEndpointTest {

    private static final String LOGIN_URL = "/api/auth/login";
    private static final String LOGOUT_URL = "/api/auth/logout";
    private static final String PASSWORD = "senhaForte123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FamilyGroupRepository familyGroupRepository;

    @Autowired
    private LoginAttemptRepository loginAttemptRepository;

    @Autowired
    private AuthSessionRepository authSessionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void principalAndDependentCanLoginAfterEmailConfirmation() throws Exception {
        User principal = createUser(Role.PRINCIPAL, UserStatus.ATIVO, true);
        User dependent = createUser(Role.DEPENDENTE, UserStatus.ATIVO, true);

        MvcResult principalResult = login(principal.getEmail(), PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("PRINCIPAL"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andReturn();
        MvcResult dependentResult = login(dependent.getEmail(), PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("DEPENDENTE"))
                .andReturn();

        String principalToken = tokenFrom(principalResult);
        String dependentToken = tokenFrom(dependentResult);
        assertThat(principalToken).isNotBlank();
        assertThat(dependentToken).isNotBlank();
        assertThat(authSessionRepository.count()).isEqualTo(2);
    }

    @Test
    void invalidEmailAndPasswordReturnSameGenericResponseAndAreCounted() throws Exception {
        User user = createUser(Role.PRINCIPAL, UserStatus.ATIVO, true);

        MvcResult wrongPassword = login(user.getEmail(), "senhaErrada123")
                .andExpect(status().isUnauthorized())
                .andReturn();
        MvcResult unknownEmail = login("nao.existe-" + UUID.randomUUID() + "@example.com", PASSWORD)
                .andExpect(status().isUnauthorized())
                .andReturn();

        JsonNode passwordError = objectMapper.readTree(wrongPassword.getResponse().getContentAsString());
        JsonNode emailError = objectMapper.readTree(unknownEmail.getResponse().getContentAsString());
        assertThat(passwordError.get("mensagens").get(0).asText()).isEqualTo("E-mail ou senha inválidos.");
        assertThat(emailError.get("mensagens").get(0).asText()).isEqualTo("E-mail ou senha inválidos.");
        assertThat(passwordError.get("mensagens")).isEqualTo(emailError.get("mensagens"));
        LoginAttempt failedPasswordAttempt = loginAttemptRepository.findById(emailHash(user.getEmail()))
                .orElseThrow();
        assertThat(failedPasswordAttempt.getFailedAttempts()).isEqualTo(1);
    }

    @Test
    void fifthFailureLocksIdentifierForFifteenMinutesAndSuccessfulLoginResetsCounter() throws Exception {
        User user = createUser(Role.PRINCIPAL, UserStatus.ATIVO, true);

        for (int i = 0; i < 4; i++) {
            login(user.getEmail(), "senhaErrada123").andExpect(status().isUnauthorized());
        }
        MvcResult fifthAttempt = login(user.getEmail(), "senhaErrada123")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.mensagens[0]").value(org.hamcrest.Matchers.containsString(
                        "Acesso temporariamente bloqueado."
                )))
                .andReturn();
        assertThat(fifthAttempt.getResponse().getContentAsString()).contains("temporariamente bloqueado");

        login(user.getEmail(), PASSWORD).andExpect(status().isTooManyRequests());
        LoginAttempt locked = loginAttemptRepository.findById(emailHash(user.getEmail())).orElseThrow();
        assertThat(locked.getFailedAttempts()).isEqualTo(5);
        assertThat(locked.getLastFailedAt()).isNotNull();
        assertThat(locked.getLockedUntil()).isAfter(LocalDateTime.now().plusMinutes(14));

        locked.setLockedUntil(LocalDateTime.now().minusSeconds(1));
        loginAttemptRepository.saveAndFlush(locked);

        login(user.getEmail(), PASSWORD).andExpect(status().isOk());
        LoginAttempt reset = loginAttemptRepository.findById(emailHash(user.getEmail())).orElseThrow();
        assertThat(reset.getFailedAttempts()).isZero();
        assertThat(reset.getLastFailedAt()).isNull();
        assertThat(reset.getLockedUntil()).isNull();
    }

    @Test
    void unconfirmedRemovedAndInactiveUsersCannotLogin() throws Exception {
        User unconfirmed = createUser(Role.PRINCIPAL, UserStatus.ATIVO, false);
        User removed = createUser(Role.DEPENDENTE, UserStatus.REMOVIDO, true);
        User inactive = createUser(Role.DEPENDENTE, UserStatus.INATIVO, true);

        login(unconfirmed.getEmail(), PASSWORD).andExpect(status().isUnauthorized());
        login(removed.getEmail(), PASSWORD).andExpect(status().isUnauthorized());
        login(inactive.getEmail(), PASSWORD).andExpect(status().isUnauthorized());
        assertThat(authSessionRepository.count()).isZero();
    }

    @Test
    void logoutRevokesTokenImmediately() throws Exception {
        User user = createUser(Role.PRINCIPAL, UserStatus.ATIVO, true);
        String accessToken = tokenFrom(login(user.getEmail(), PASSWORD).andExpect(status().isOk()).andReturn());

        mockMvc.perform(post(LOGOUT_URL).header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNoContent());
        mockMvc.perform(post(LOGOUT_URL).header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());
    }

    private org.springframework.test.web.servlet.ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post(LOGIN_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(email, password))));
    }

    private User createUser(Role role, UserStatus userStatus, boolean emailConfirmed) {
        FamilyGroup familyGroup = familyGroupRepository.save(FamilyGroup.builder().build());
        return userRepository.save(User.builder()
                .familyGroup(familyGroup)
                .name("Usuário de teste")
                .email("login-" + UUID.randomUUID() + "@example.com")
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .role(role)
                .status(userStatus)
                .emailConfirmed(emailConfirmed)
                .build());
    }

    private String tokenFrom(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("accessToken").asText();
    }

    private String emailHash(String email) {
        return TokenHashUtils.hashIdentifier(email.toLowerCase(java.util.Locale.ROOT));
    }
}
