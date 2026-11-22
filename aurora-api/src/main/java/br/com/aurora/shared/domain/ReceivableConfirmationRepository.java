package br.com.aurora.shared.domain;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReceivableConfirmationRepository extends JpaRepository<ReceivableConfirmation, UUID> {

    @EntityGraph(attributePaths = {"receivedBy"})
    Optional<ReceivableConfirmation> findByReceivableId(UUID receivableId);

    @EntityGraph(attributePaths = {"receivedBy"})
    List<ReceivableConfirmation> findByReceivableIdIn(Collection<UUID> receivableIds);
}
