package br.com.aurora.shared.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FamilyInviteRepository extends JpaRepository<FamilyInvite, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select invite from FamilyInvite invite where invite.tokenHash = :tokenHash")
    Optional<FamilyInvite> findByTokenHash(@Param("tokenHash") String tokenHash);

    List<FamilyInvite> findByFamilyGroupIdAndInvitedEmailAndStatusIn(
            UUID familyGroupId,
            String invitedEmail,
            List<FamilyInviteStatus> statuses
    );
}
