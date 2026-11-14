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
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    List<Expense> findByFamilyGroupIdAndStatusOrderByExpenseDateDesc(UUID familyGroupId, ExpenseStatus status);

    List<Expense> findByFamilyGroupIdAndUserIdAndStatusOrderByExpenseDateDesc(
            UUID familyGroupId,
            UUID userId,
            ExpenseStatus status
    );

    Optional<Expense> findByIdAndFamilyGroupIdAndStatus(UUID id, UUID familyGroupId, ExpenseStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Expense e where e.id = :id and e.familyGroup.id = :familyGroupId and e.status = :status")
    Optional<Expense> findForUpdate(
            @Param("id") UUID id,
            @Param("familyGroupId") UUID familyGroupId,
            @Param("status") ExpenseStatus status
    );
}
