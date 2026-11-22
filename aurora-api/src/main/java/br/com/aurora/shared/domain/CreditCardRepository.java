package br.com.aurora.shared.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

@Repository
public interface CreditCardRepository extends JpaRepository<CreditCard, UUID> {

    Optional<CreditCard> findByFamilyGroupIdAndActiveTrue(UUID familyGroupId);

    List<CreditCard> findByFamilyGroupIdOrderByCreatedAtDesc(UUID familyGroupId);

    Optional<CreditCard> findByIdAndFamilyGroupId(UUID id, UUID familyGroupId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CreditCard c where c.familyGroup.id = :familyGroupId and c.active = true")
    Optional<CreditCard> findActiveForUpdate(@Param("familyGroupId") UUID familyGroupId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CreditCard c where c.id = :id and c.familyGroup.id = :familyGroupId and c.active = true")
    Optional<CreditCard> findActiveByIdForUpdate(
            @Param("id") UUID id,
            @Param("familyGroupId") UUID familyGroupId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CreditCard c where c.id = :id")
    Optional<CreditCard> findForUpdateById(@Param("id") UUID id);
}
