package br.com.aurora.shared.domain;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayableBillPaymentRepository extends JpaRepository<PayableBillPayment, UUID> {

    @EntityGraph(attributePaths = {"paidBy", "expense"})
    List<PayableBillPayment> findByBillIdOrderByCreatedAtDesc(UUID billId);

    @EntityGraph(attributePaths = {"paidBy", "expense"})
    Optional<PayableBillPayment> findByBillId(UUID billId);
}
