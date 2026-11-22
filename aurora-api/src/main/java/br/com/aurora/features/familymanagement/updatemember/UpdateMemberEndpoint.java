package br.com.aurora.features.familymanagement.updatemember;

import br.com.aurora.shared.security.UsuarioAutenticado;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping({"/api/familymanagement", "/api/family-management", "/familymanagement", "/family-management"})
@RequiredArgsConstructor
public class UpdateMemberEndpoint {

    private final UpdateMemberService updateMemberService;

    @PutMapping("/members/{memberId}")
    @PreAuthorize("hasRole('PRINCIPAL')")
    public UpdateMemberResponse updateMember(
            @AuthenticationPrincipal UsuarioAutenticado authenticatedUser,
            @PathVariable UUID memberId,
            @Valid @RequestBody UpdateMemberRequest request
    ) {
        return updateMemberService.updateMember(authenticatedUser, memberId, request);
    }
}
