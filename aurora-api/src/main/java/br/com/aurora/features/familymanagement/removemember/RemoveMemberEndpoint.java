package br.com.aurora.features.familymanagement.removemember;

import br.com.aurora.shared.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/familymanagement", "/api/family-management", "/familymanagement", "/family-management"})
@RequiredArgsConstructor
public class RemoveMemberEndpoint {

    private final RemoveMemberService removeMemberService;

    @DeleteMapping("/members/{memberId}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(
            @AuthenticationPrincipal UsuarioAutenticado authenticatedUser,
            @PathVariable UUID memberId
    ) {
        removeMemberService.removeMember(authenticatedUser, memberId);
    }
}
