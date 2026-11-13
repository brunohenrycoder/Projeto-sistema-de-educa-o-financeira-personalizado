package br.com.aurora.shared.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, String> {

    @Modifying
    @Query(value = """
            insert into login_attempts (email_hash, failed_attempts)
            values (:emailHash, 0)
            on conflict (email_hash) do nothing
            """, nativeQuery = true)
    int createIfMissing(@Param("emailHash") String emailHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<LoginAttempt> findByEmailHash(String emailHash);
}
