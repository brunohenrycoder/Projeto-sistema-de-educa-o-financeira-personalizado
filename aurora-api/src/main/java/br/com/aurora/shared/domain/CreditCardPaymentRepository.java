package br.com.aurora.shared.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CreditCardPaymentRepository extends JpaRepository<CreditCardPayment, UUID> {
    List<CreditCardPayment> findByInvoiceIdOrderByPaidAtAsc(UUID invoiceId);
}
