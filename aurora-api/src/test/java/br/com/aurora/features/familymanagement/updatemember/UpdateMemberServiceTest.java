package br.com.aurora.features.familymanagement.updatemember;

import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.security.UsuarioAutenticado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class UpdateMemberServiceTest {

    @Autowired private UpdateMemberService service;
    @Autowired private UserRepository userRepository;
    @Autowired private FamilyGroupRepository familyGroupRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void updatesMemberAndHidesMembersFromOtherFamilies() {
        User principal = createUser("update-principal@aurora.com", null);
        User member = createUser("update-member@aurora.com", principal.getFamilyGroup());
        User otherPrincipal = createUser("update-other-principal@aurora.com", null);

        UpdateMemberResponse response = service.updateMember(
                UsuarioAutenticado.fromUser(principal),
                member.getId(),
                UpdateMemberRequest.builder().name("Nome Atualizado").build()
        );
        assertThat(response.getName()).isEqualTo("Nome Atualizado");
        assertThatThrownBy(() -> service.updateMember(
                UsuarioAutenticado.fromUser(principal),
                otherPrincipal.getId(),
                UpdateMemberRequest.builder().name("Nome Atualizado").build()
        )).isInstanceOf(ResourceNotFoundException.class);
    }

    private User createUser(String email, FamilyGroup familyGroup) {
        FamilyGroup group = familyGroup != null ? familyGroup : familyGroupRepository.save(FamilyGroup.builder().build());
        return userRepository.save(User.builder()
                .familyGroup(group)
                .name("Membro")
                .email(email)
                .passwordHash(passwordEncoder.encode("senhaForte123"))
                .role(familyGroup == null ? Role.PRINCIPAL : Role.DEPENDENTE)
                .status(UserStatus.ATIVO)
                .emailConfirmed(true)
                .build());
    }
}
