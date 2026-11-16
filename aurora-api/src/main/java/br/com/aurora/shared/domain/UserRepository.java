package br.com.aurora.shared.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    boolean existsByEmailIgnoreCase(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByIdAndFamilyGroupId(UUID id, UUID familyGroupId);
    List<User> findByFamilyGroupIdAndStatusOrderByNameAsc(UUID familyGroupId, UserStatus status);

    @Query("""
            select u.familyGroup.id from User u
            where u.role = :role and u.status = :status and u.emailConfirmed = true
            """)
    List<UUID> findActivePrincipalFamilyGroupIds(
            @org.springframework.data.repository.query.Param("role") Role role,
            @org.springframework.data.repository.query.Param("status") UserStatus status
    );
}
