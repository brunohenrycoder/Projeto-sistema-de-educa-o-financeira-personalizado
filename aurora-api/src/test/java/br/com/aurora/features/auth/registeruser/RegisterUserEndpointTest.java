package br.com.aurora.features.auth.registeruser;

import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.EmailVerificationToken;
import br.com.aurora.shared.domain.EmailVerificationTokenRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.email.EmailSender;
import br.com.aurora.shared.error.EmailDeliveryException;
import br.com.aurora.shared.security.TokenHashUtils;
import br.com.aurora.features.auth.confirmemail.ConfirmEmailRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import org.mockito.ArgumentCaptor;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RegisterUserEndpointTest {

    private static final String REGISTER_URL = "/api/auth/register";
    private static final String CONFIRM_EMAIL_URL = "/api/auth/confirm-email";

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FamilyGroupRepository familyGroupRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @MockitoBean
    private EmailSender emailSender;

    @Test
    @DisplayName("Deve cadastrar usuário principal e criar grupo familiar com sucesso")
    void shouldRegisterUserSuccessfully() throws Exception {
        RegisterUserRequest request = RegisterUserRequest.builder()
                .name("Carlos Silva")
                .email("Carlos.Silva@Example.Com")
                .password("senhaForte123")
                .passwordConfirmation("senhaForte123")
                .build();

        MvcResult result = mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").isNotEmpty())
                .andExpect(jsonPath("$.familyGroupId").isNotEmpty())
                .andExpect(jsonPath("$.name").value("Carlos Silva"))
                .andExpect(jsonPath("$.email").value("carlos.silva@example.com"))
                .andExpect(jsonPath("$.role").value("PRINCIPAL"))
                .andExpect(jsonPath("$.status").value("ATIVO"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty())
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        UUID userId = UUID.fromString(com.jayway.jsonpath.JsonPath.read(responseContent, "$.userId"));
        UUID familyGroupId = UUID.fromString(com.jayway.jsonpath.JsonPath.read(responseContent, "$.familyGroupId"));

        Optional<User> savedUserOpt = userRepository.findById(userId);
        assertThat(savedUserOpt).isPresent();

        User savedUser = savedUserOpt.get();
        assertThat(savedUser.getName()).isEqualTo("Carlos Silva");
        assertThat(savedUser.getEmail()).isEqualTo("carlos.silva@example.com");
        assertThat(savedUser.getRole()).isEqualTo(Role.PRINCIPAL);
        assertThat(savedUser.getStatus()).isEqualTo(UserStatus.ATIVO);
        assertThat(savedUser.isEmailConfirmed()).isFalse();
        assertThat(savedUser.getFamilyGroup()).isNotNull();
        assertThat(savedUser.getFamilyGroup().getId()).isEqualTo(familyGroupId);
        assertThat(familyGroupRepository.existsById(familyGroupId)).isTrue();
        assertThat(passwordEncoder.matches("senhaForte123", savedUser.getPasswordHash())).isTrue();
    }

    @Test
    @DisplayName("Deve confirmar e-mail com token enviado e recusar sua reutilização")
    void shouldConfirmEmailAndRejectTokenReuse() throws Exception {
        RegisterUserRequest request = RegisterUserRequest.builder()
                .name("Mariana Souza")
                .email("mariana.confirmacao@example.com")
                .password("senhaForte123")
                .passwordConfirmation("senhaForte123")
                .build();

        String responseBody = mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(responseBody).doesNotContain("token").doesNotContain("confirm-email#");

        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailSender).sendEmailConfirmation(eq("mariana.confirmacao@example.com"), linkCaptor.capture());
        String confirmationLink = linkCaptor.getValue();
        assertThat(confirmationLink).contains("#token=");
        String rawToken = confirmationLink.substring(confirmationLink.indexOf("#token=") + "#token=".length());
        String tokenHash = TokenHashUtils.hashToken(rawToken);
        assertThat(emailVerificationTokenRepository.findByTokenHash(tokenHash)).isPresent();
        assertThat(emailVerificationTokenRepository.findByTokenHash(rawToken)).isEmpty();

        UUID userId = UUID.fromString(com.jayway.jsonpath.JsonPath.read(responseBody, "$.userId"));
        assertThat(userRepository.findById(userId).orElseThrow().isEmailConfirmed()).isFalse();

        String confirmationRequest = objectMapper.writeValueAsString(new ConfirmEmailRequest(rawToken));
        mockMvc.perform(post(CONFIRM_EMAIL_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(confirmationRequest))
                .andExpect(status().isNoContent());

        assertThat(userRepository.findById(userId).orElseThrow().isEmailConfirmed()).isTrue();

        mockMvc.perform(post(CONFIRM_EMAIL_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(confirmationRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagens", hasItem(
                        "O link de confirmação é inválido, expirou ou já foi utilizado."
                )));
    }

    @Test
    @DisplayName("Deve recusar token de confirmação desconhecido")
    void shouldRejectUnknownConfirmationToken() throws Exception {
        mockMvc.perform(post(CONFIRM_EMAIL_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ConfirmEmailRequest("token-invalido"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagens", hasItem(
                        "O link de confirmação é inválido, expirou ou já foi utilizado."
                )));
    }

    @Test
    @DisplayName("Deve recusar token de confirmação expirado")
    void shouldRejectExpiredConfirmationToken() throws Exception {
        RegisterUserRequest request = RegisterUserRequest.builder()
                .name("Paulo Mendes")
                .email("paulo.expirado@example.com")
                .password("senhaForte123")
                .passwordConfirmation("senhaForte123")
                .build();

        String responseBody = mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        UUID userId = UUID.fromString(com.jayway.jsonpath.JsonPath.read(responseBody, "$.userId"));
        User user = userRepository.findById(userId).orElseThrow();

        String expiredRawToken = "expired-test-token";
        emailVerificationTokenRepository.saveAndFlush(EmailVerificationToken.builder()
                .user(user)
                .tokenHash(TokenHashUtils.hashToken(expiredRawToken))
                .expiresAt(LocalDateTime.now().minusMinutes(1))
                .build());

        mockMvc.perform(post(CONFIRM_EMAIL_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ConfirmEmailRequest(expiredRawToken))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagens", hasItem(
                        "O link de confirmação é inválido, expirou ou já foi utilizado."
                )));

        assertThat(userRepository.findById(userId).orElseThrow().isEmailConfirmed()).isFalse();
    }

    @Test
    @DisplayName("Deve retornar indisponibilidade quando o envio do e-mail falhar")
    void shouldReportEmailDeliveryFailure() throws Exception {
        RegisterUserRequest request = RegisterUserRequest.builder()
                .name("Juliana Lima")
                .email("juliana.emailfalha@example.com")
                .password("senhaForte123")
                .passwordConfirmation("senhaForte123")
                .build();
        doThrow(new EmailDeliveryException("Falha SMTP"))
                .when(emailSender)
                .sendEmailConfirmation(eq("juliana.emailfalha@example.com"), org.mockito.ArgumentMatchers.anyString());

        mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.mensagens").value(
                        "Não foi possível enviar o e-mail de confirmação. Tente novamente mais tarde."
                ));
    }

    @Test
    @DisplayName("Deve falhar ao tentar cadastrar e-mail já existente com 409 Conflict")
    void shouldFailWhenRegisteringDuplicateEmail() throws Exception {
        RegisterUserRequest firstRequest = RegisterUserRequest.builder()
                .name("Carlos Silva")
                .email("duplicado@example.com")
                .password("senhaForte123")
                .passwordConfirmation("senhaForte123")
                .build();

        mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(firstRequest)))
                .andExpect(status().isCreated());

        RegisterUserRequest secondRequest = RegisterUserRequest.builder()
                .name("Outro Carlos")
                .email("duplicado@example.com")
                .password("outraSenha123")
                .passwordConfirmation("outraSenha123")
                .build();

        mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(secondRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.erro").value("Conflito de dados"))
                .andExpect(jsonPath("$.mensagens", hasItem("Já existe um usuário cadastrado com este e-mail.")))
                .andExpect(jsonPath("$.caminho").value(REGISTER_URL));
    }

    @Test
    @DisplayName("Deve falhar ao tentar cadastrar e-mail já existente com maiúsculas/minúsculas diferentes (case insensitive)")
    void shouldFailWhenRegisteringDuplicateEmailCaseInsensitive() throws Exception {
        RegisterUserRequest firstRequest = RegisterUserRequest.builder()
                .name("Ana Paula")
                .email("ana.paula@example.com")
                .password("senhaForte123")
                .passwordConfirmation("senhaForte123")
                .build();

        mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(firstRequest)))
                .andExpect(status().isCreated());

        RegisterUserRequest secondRequest = RegisterUserRequest.builder()
                .name("Ana Paula Silva")
                .email("ANA.PAULA@EXAMPLE.COM")
                .password("senhaForte456")
                .passwordConfirmation("senhaForte456")
                .build();

        mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(secondRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.erro").value("Conflito de dados"))
                .andExpect(jsonPath("$.mensagens", hasItem("Já existe um usuário cadastrado com este e-mail.")))
                .andExpect(jsonPath("$.caminho").value(REGISTER_URL));
    }

    @Test
    @DisplayName("Deve falhar com 400 Bad Request quando a senha tiver menos de 8 caracteres")
    void shouldFailWhenPasswordIsTooShort() throws Exception {
        RegisterUserRequest request = RegisterUserRequest.builder()
                .name("Roberto Santos")
                .email("roberto@example.com")
                .password("1234567")
                .passwordConfirmation("1234567")
                .build();

        mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.erro").value("Dados inválidos"))
                .andExpect(jsonPath("$.mensagens", hasItem("A senha deve ter no mínimo 8 caracteres")))
                .andExpect(jsonPath("$.caminho").value(REGISTER_URL));
    }

    @Test
    @DisplayName("Deve falhar com 400 Bad Request quando a confirmação de senha for diferente")
    void shouldFailWhenPasswordsDoNotMatch() throws Exception {
        RegisterUserRequest request = RegisterUserRequest.builder()
                .name("Roberto Santos")
                .email("roberto.divergente@example.com")
                .password("senhaCorreta123")
                .passwordConfirmation("senhaDiferente456")
                .build();

        mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.erro").value("Regra de negócio violada"))
                .andExpect(jsonPath("$.mensagens", hasItem("A confirmação de senha não confere.")))
                .andExpect(jsonPath("$.caminho").value(REGISTER_URL));
    }

    @Test
    @DisplayName("Deve falhar com 400 Bad Request quando campos obrigatórios estiverem ausentes ou em branco")
    void shouldFailWhenRequiredFieldsAreMissing() throws Exception {
        RegisterUserRequest request = RegisterUserRequest.builder()
                .name("")
                .email("email-invalido")
                .password("")
                .passwordConfirmation("")
                .build();

        mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.erro").value("Dados inválidos"))
                .andExpect(jsonPath("$.mensagens", hasItem("O nome é obrigatório")))
                .andExpect(jsonPath("$.mensagens", hasItem("O e-mail informado é inválido")))
                .andExpect(jsonPath("$.mensagens", hasItem("A senha é obrigatória")))
                .andExpect(jsonPath("$.mensagens", hasItem("A confirmação de senha é obrigatória")));
    }

    @Test
    @DisplayName("Deve garantir que a resposta da API nunca traga senha nem hash")
    void shouldNeverExposePasswordOrHashInResponse() throws Exception {
        String plainPassword = "senhaSuperSecreta123";
        RegisterUserRequest request = RegisterUserRequest.builder()
                .name("Marcos Vinicius")
                .email("marcos.seguro@example.com")
                .password(plainPassword)
                .passwordConfirmation(plainPassword)
                .build();

        MvcResult result = mockMvc.perform(post(REGISTER_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password_hash").doesNotExist())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assertThat(responseBody).doesNotContain(plainPassword);
        assertThat(responseBody.toLowerCase()).doesNotContain("hash");
        assertThat(responseBody.toLowerCase()).doesNotContain("password");
    }
}
