package br.com.aurora.features.familymanagement.acceptfamilyinvite;

import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.FamilyInvite;
import br.com.aurora.shared.domain.FamilyInviteRepository;
import br.com.aurora.shared.domain.FamilyInviteStatus;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.TokenHashUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class AcceptFamilyInviteServiceTest {

    @Autowired private AcceptFamilyInviteService service;
    @Autowired private FamilyGroupRepository familyGroupRepository;
    @Autowired private FamilyInviteRepository familyInviteRepository;
    @Autowired private UserRepository userRepository;
    @SuppressWarnings("unused")
@Autowired private PasswordEncoder passwordEncoder;

    @Test
    void acceptsInviteOnceAndCreatesDependentInInviteFamily() {
        FamilyGroup group = familyGroupRepository.save(FamilyGroup.builder().build());
        FamilyInvite invite = createInvite(group, "accept-token", LocalDateTime.now().plusHours(48));

        AcceptFamilyInviteResponse response = service.acceptInvite(request("accept-token", invite.getInvitedEmail()));

        assertThat(response.getFamilyGroupId()).isEqualTo(group.getId());
        assertThat(response.getRole().name()).isEqualTo("DEPENDENTE");
        assertThat(familyInviteRepository.findById(invite.getId()).orElseThrow().getStatus())
                .isEqualTo(FamilyInviteStatus.ACEITO);
        assertThat(userRepository.findByEmailIgnoreCase(invite.getInvitedEmail())).isPresent();
        assertThatThrownBy(() -> service.acceptInvite(request("accept-token", invite.getInvitedEmail())))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void persistsExpiredInviteStatusWhenRejectingIt() {
        FamilyGroup group = familyGroupRepository.save(FamilyGroup.builder().build());
        FamilyInvite invite = createInvite(group, "expired-token", LocalDateTime.now().minusMinutes(1));

        assertThatThrownBy(() -> service.acceptInvite(request("expired-token", invite.getInvitedEmail())))
                .isInstanceOf(ValidationException.class);

        assertThat(familyInviteRepository.findById(invite.getId()).orElseThrow().getStatus())
                .isEqualTo(FamilyInviteStatus.EXPIRADO);
    }

    private FamilyInvite createInvite(FamilyGroup group, String token, LocalDateTime expiresAt) {
        return familyInviteRepository.save(FamilyInvite.builder()
                .familyGroup(group)
                .invitedEmail(token + "@aurora.com")
                .tokenHash(TokenHashUtils.hashToken(token))
                .status(FamilyInviteStatus.PENDENTE)
                .createdAt(LocalDateTime.now().minusHours(1))
                .expiresAt(expiresAt)
                .build());
    }

    private AcceptFamilyInviteRequest request(String token, String email) {
        return AcceptFamilyInviteRequest.builder()
                .token(token)
                .email(email)
                .name("Dependente Novo")
                .password("senhaForte123")
                .passwordConfirmation("senhaForte123")
                .build();
    }
}
