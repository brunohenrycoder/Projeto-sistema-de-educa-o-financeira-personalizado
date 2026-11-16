package br.com.aurora.shared.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayableBillRepository extends JpaRepository<PayableBill, UUID> {

    @EntityGraph(attributePaths = {"series"})
    List<PayableBill> findByFamilyGroupIdOrderByDueDateAsc(UUID familyGroupId);

    @EntityGraph(attributePaths = {"series"})
    Optional<PayableBill> findByIdAndFamilyGroupId(UUID id, UUID familyGroupId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from PayableBill b join fetch b.series "
            + "where b.id = :id and b.familyGroup.id = :familyGroupId")
    Optional<PayableBill> findForUpdate(
            @Param("id") UUID id,
            @Param("familyGroupId") UUID familyGroupId
    );

    @EntityGraph(attributePaths = {"series"})
    Optional<PayableBill> findBySeriesIdAndOccurrenceNumber(UUID seriesId, int occurrenceNumber);

    @EntityGraph(attributePaths = {"series"})
    List<PayableBill> findBySeriesIdAndOccurrenceNumberGreaterThanAndStatusInOrderByOccurrenceNumber(
            UUID seriesId,
            int occurrenceNumber,
            List<PayableBillStatus> statuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from PayableBill b where b.status = :status and b.dueDate < :today")
    List<PayableBill> findForOverdueRefresh(
            @Param("status") PayableBillStatus status,
            @Param("today") LocalDate today
    );
}
