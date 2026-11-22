package br.com.aurora.shared.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReceivableSeriesRepository extends JpaRepository<ReceivableSeries, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ReceivableSeries s where s.id = :id and s.familyGroup.id = :familyGroupId")
    Optional<ReceivableSeries> findForUpdate(
            @Param("id") UUID id,
            @Param("familyGroupId") UUID familyGroupId
    );
}
