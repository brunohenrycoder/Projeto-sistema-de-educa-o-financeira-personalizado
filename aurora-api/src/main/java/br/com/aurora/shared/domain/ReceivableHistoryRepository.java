package br.com.aurora.shared.domain;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReceivableHistoryRepository extends JpaRepository<ReceivableHistory, UUID> {

    @EntityGraph(attributePaths = {"changedBy"})
    List<ReceivableHistory> findByReceivableIdOrderByChangedAtAsc(UUID receivableId);
}
