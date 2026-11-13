package br.com.aurora.features.familymanagement;

import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.UserStatus;
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
public class AcceptFamilyInviteResponse {

    private UUID userId;
    private UUID familyGroupId;
    private String name;
    private String email;
    private Role role;
    private UserStatus status;
    private LocalDateTime createdAt;
}
