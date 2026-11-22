package br.com.aurora.shared.domain;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CreditCardInstallmentRepository extends JpaRepository<CreditCardInstallment, UUID> {

    @EntityGraph(attributePaths = {"invoice", "expense"})
    List<CreditCardInstallment> findByExpenseIdOrderByInstallmentNumber(UUID expenseId);

    @EntityGraph(attributePaths = {"expense", "invoice"})
    List<CreditCardInstallment> findByInvoiceIdOrderByExpenseExpenseDateAscInstallmentNumberAsc(UUID invoiceId);

    @Query("select coalesce(sum(i.amount - i.paidAmount - i.refundedAmount - i.creditedAmount), 0) "
            + "from CreditCardInstallment i where i.invoice.card.id = :cardId and i.cancelled = false")
    java.math.BigDecimal sumCommittedAmountByCardId(@Param("cardId") UUID cardId);
}
