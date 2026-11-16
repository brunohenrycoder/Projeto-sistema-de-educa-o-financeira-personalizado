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
public interface ReceivableRepository extends JpaRepository<Receivable, UUID> {

    @EntityGraph(attributePaths = {"series"})
    List<Receivable> findByFamilyGroupIdOrderByExpectedDateAsc(UUID familyGroupId);

    @EntityGraph(attributePaths = {"series"})
    Optional<Receivable> findByIdAndFamilyGroupId(UUID id, UUID familyGroupId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Receivable r join fetch r.series "
            + "where r.id = :id and r.familyGroup.id = :familyGroupId")
    Optional<Receivable> findForUpdate(
            @Param("id") UUID id,
            @Param("familyGroupId") UUID familyGroupId
    );

    @EntityGraph(attributePaths = {"series"})
    Optional<Receivable> findBySeriesIdAndOccurrenceNumber(UUID seriesId, int occurrenceNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Receivable r where r.series.id = :seriesId "
            + "and r.occurrenceNumber >= :occurrenceNumber and r.status in :statuses "
            + "order by r.occurrenceNumber")
    List<Receivable> findForUpdateBySeriesAndOccurrenceNumber(
            @Param("seriesId") UUID seriesId,
            @Param("occurrenceNumber") int occurrenceNumber,
            @Param("statuses") List<ReceivableStatus> statuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Receivable r where r.status = :status and r.expectedDate < :today")
    List<Receivable> findForOverdueRefresh(
            @Param("status") ReceivableStatus status,
            @Param("today") LocalDate today
    );
}
