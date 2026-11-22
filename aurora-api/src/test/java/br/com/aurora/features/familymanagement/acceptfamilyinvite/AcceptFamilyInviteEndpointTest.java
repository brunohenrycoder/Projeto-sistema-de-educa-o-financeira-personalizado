package br.com.aurora.features.familymanagement.acceptfamilyinvite;

import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.FamilyInvite;
import br.com.aurora.shared.domain.FamilyInviteRepository;
import br.com.aurora.shared.domain.FamilyInviteStatus;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.security.TokenHashUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
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
class AcceptFamilyInviteEndpointTest {

    private static final String ACCEPT_INVITE_URL = "/api/familymanagement/accept-invite";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FamilyGroupRepository familyGroupRepository;

    @Autowired
    private FamilyInviteRepository familyInviteRepository;

    @Autowired
    private UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    @DisplayName("POST /accept-invite sem autenticação retorna 201 e cria o Dependente no grupo do convite")
    void acceptsInviteWithoutAuthentication() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String token = "endpoint-token-" + suffix;
        String email = "endpoint-dependent-" + suffix + "@aurora.com";

        FamilyGroup group = familyGroupRepository.save(FamilyGroup.builder().build());
        FamilyInvite invite = familyInviteRepository.save(FamilyInvite.builder()
                .familyGroup(group)
                .invitedEmail(email)
                .tokenHash(TokenHashUtils.hashToken(token))
                .status(FamilyInviteStatus.PENDENTE)
                .createdAt(LocalDateTime.now().minusHours(1))
                .expiresAt(LocalDateTime.now().plusHours(48))
                .build());

        String payload = objectMapper.writeValueAsString(AcceptFamilyInviteRequest.builder()
                .token(token)
                .email(email)
                .name("Dependente Endpoint")
                .password("senhaForte123")
                .passwordConfirmation("senhaForte123")
                .build());

        mockMvc.perform(post(ACCEPT_INVITE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.familyGroupId").value(group.getId().toString()))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value(Role.DEPENDENTE.name()))
                .andExpect(jsonPath("$.status").value(UserStatus.ATIVO.name()));

        User created = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(created.getRole()).isEqualTo(Role.DEPENDENTE);
        assertThat(created.getStatus()).isEqualTo(UserStatus.ATIVO);
        assertThat(created.isEmailConfirmed()).isTrue();
        assertThat(created.getFamilyGroup().getId()).isEqualTo(group.getId());
        assertThat(familyInviteRepository.findById(invite.getId()).orElseThrow().getStatus())
                .isEqualTo(FamilyInviteStatus.ACEITO);
    }

    @Test
    @DisplayName("POST /accept-invite sem autenticação alcança a validação do DTO (400), não o bloqueio de segurança (401)")
    void invalidPayloadReachesValidationWithoutAuthentication() throws Exception {
        String payload = objectMapper.writeValueAsString(AcceptFamilyInviteRequest.builder()
                .token("")
                .email("endpoint-invalido@aurora.com")
                .name("Dependente Endpoint")
                .password("senhaForte123")
                .passwordConfirmation("senhaForte123")
                .build());

        mockMvc.perform(post(ACCEPT_INVITE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());
    }
}
