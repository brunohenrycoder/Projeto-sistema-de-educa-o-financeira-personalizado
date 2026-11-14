package br.com.aurora.features.familymanagement.invitedependent;

import br.com.aurora.shared.security.UsuarioAutenticado;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/familymanagement", "/api/family-management", "/familymanagement", "/family-management"})
@RequiredArgsConstructor
public class InviteDependentEndpoint {

    private final InviteDependentService inviteDependentService;

    @PostMapping("/invite")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @ResponseStatus(HttpStatus.CREATED)
    public InviteDependentResponse inviteDependent(
            @AuthenticationPrincipal UsuarioAutenticado authenticatedUser,
            @Valid @RequestBody InviteDependentRequest request
    ) {
        return inviteDependentService.inviteDependent(authenticatedUser, request);
    }
}
