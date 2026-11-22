package br.com.aurora.features.expenses;

import br.com.aurora.shared.domain.FamilyGroup;
import br.com.aurora.shared.domain.FamilyGroupRepository;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import br.com.aurora.shared.security.UsuarioAutenticado;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

public abstract class ExpenseServiceTestSupport {

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected FamilyGroupRepository familyGroupRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    protected User createUser(Role role, String email, FamilyGroup familyGroup) {
        FamilyGroup group = familyGroup != null ? familyGroup : familyGroupRepository.save(FamilyGroup.builder().build());
        User user = User.builder()
                .familyGroup(group)
                .name(role == Role.PRINCIPAL ? "Principal" : "Dependente")
                .email(email)
                .passwordHash(passwordEncoder.encode("senhaForte123"))
                .role(role)
                .status(UserStatus.ATIVO)
                .emailConfirmed(true)
                .build();
        return userRepository.save(user);
    }

    protected void setAuthenticatedUser(User user) {
        UsuarioAutenticado authenticatedUser = UsuarioAutenticado.fromUser(user);
        SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        authenticatedUser,
                        null,
                        authenticatedUser.getAuthorities()
                )
        );
    }
}
