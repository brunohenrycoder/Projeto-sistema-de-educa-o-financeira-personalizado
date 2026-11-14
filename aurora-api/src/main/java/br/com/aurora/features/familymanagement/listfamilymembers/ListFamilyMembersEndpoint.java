package br.com.aurora.features.familymanagement.listfamilymembers;

import br.com.aurora.shared.security.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/familymanagement", "/api/family-management", "/familymanagement", "/family-management"})
@RequiredArgsConstructor
public class ListFamilyMembersEndpoint {

    private final ListFamilyMembersService listFamilyMembersService;

    @GetMapping("/members")
    @PreAuthorize("hasRole('PRINCIPAL')")
    public List<ListFamilyMembersResponse> listMembers(
            @AuthenticationPrincipal UsuarioAutenticado authenticatedUser
    ) {
        return listFamilyMembersService.listMembers(authenticatedUser);
    }
}
