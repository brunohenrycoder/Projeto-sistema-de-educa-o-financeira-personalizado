package br.com.aurora.shared.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {

    boolean existsByIdAndUserIdAndRevokedAtIsNullAndExpiresAtAfter(
            UUID id,
            UUID userId,
            LocalDateTime now
    );

    @Modifying
    @Query("""
            update AuthSession session
            set session.revokedAt = :now
            where session.id = :sessionId
              and session.user.id = :userId
              and session.revokedAt is null
            """)
    int revoke(
            @Param("sessionId") UUID sessionId,
            @Param("userId") UUID userId,
            @Param("now") LocalDateTime now
    );

    @Modifying
    @Query("""
            delete from AuthSession session
            where session.revokedAt is not null or session.expiresAt <= :now
            """)
    int deleteExpiredOrRevoked(@Param("now") LocalDateTime now);
}
