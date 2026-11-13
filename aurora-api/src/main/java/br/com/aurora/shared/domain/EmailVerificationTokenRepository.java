package br.com.aurora.shared.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {
    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("""
            update EmailVerificationToken token
            set token.usedAt = :now
            where token.tokenHash = :tokenHash
              and token.usedAt is null
              and token.expiresAt > :now
            """)
    int consumeIfValid(@Param("tokenHash") String tokenHash, @Param("now") LocalDateTime now);
}
