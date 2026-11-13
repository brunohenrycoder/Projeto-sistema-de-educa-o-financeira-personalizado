package br.com.aurora.features.familymanagement;

import br.com.aurora.shared.security.UsuarioAutenticado;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({
        "/api/familymanagement",
        "/api/family-management",
        "/familymanagement",
        "/family-management"
})
@RequiredArgsConstructor
public class FamilyManagementEndpoint {

    private final FamilyManagementService familyManagementService;

    @PostMapping("/invite")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @ResponseStatus(HttpStatus.CREATED)
    public InviteDependentResponse inviteDependent(
            @AuthenticationPrincipal UsuarioAutenticado authenticatedUser,
            @Valid @RequestBody InviteDependentRequest request
    ) {
        return familyManagementService.inviteDependent(authenticatedUser, request);
    }

    @PostMapping("/accept-invite")
    @ResponseStatus(HttpStatus.CREATED)
    public AcceptFamilyInviteResponse acceptInvite(@Valid @RequestBody AcceptFamilyInviteRequest request) {
        return familyManagementService.acceptInvite(request);
    }

    @GetMapping("/members")
    @PreAuthorize("hasRole('PRINCIPAL')")
    public List<FamilyMemberResponse> listMembers(@AuthenticationPrincipal UsuarioAutenticado authenticatedUser) {
        return familyManagementService.listMembers(authenticatedUser);
    }

    @PutMapping("/members/{memberId}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    public FamilyMemberResponse updateMember(
            @AuthenticationPrincipal UsuarioAutenticado authenticatedUser,
            @PathVariable UUID memberId,
            @Valid @RequestBody UpdateMemberRequest request
    ) {
        return familyManagementService.updateMember(authenticatedUser, memberId, request);
    }

    @DeleteMapping("/members/{memberId}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(
            @AuthenticationPrincipal UsuarioAutenticado authenticatedUser,
            @PathVariable UUID memberId
    ) {
        familyManagementService.removeMember(authenticatedUser, memberId);
    }
}
