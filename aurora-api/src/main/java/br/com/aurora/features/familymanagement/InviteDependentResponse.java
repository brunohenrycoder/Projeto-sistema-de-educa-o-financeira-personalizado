package br.com.aurora.features.familymanagement;

import br.com.aurora.shared.domain.FamilyInviteStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InviteDependentResponse {

    private UUID inviteId;
    private UUID familyGroupId;
    private String invitedEmail;
    private FamilyInviteStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}
