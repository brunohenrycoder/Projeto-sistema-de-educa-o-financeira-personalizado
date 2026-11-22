package br.com.aurora.features.familymanagement.acceptfamilyinvite;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/familymanagement", "/api/family-management", "/familymanagement", "/family-management"})
@RequiredArgsConstructor
public class AcceptFamilyInviteEndpoint {

    private final AcceptFamilyInviteService acceptFamilyInviteService;

    @PostMapping("/accept-invite")
    @ResponseStatus(HttpStatus.CREATED)
    public AcceptFamilyInviteResponse acceptInvite(@Valid @RequestBody AcceptFamilyInviteRequest request) {
        return acceptFamilyInviteService.acceptInvite(request);
    }
}
