package br.com.aurora.shared.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface CreditCardRefundRepository extends JpaRepository<CreditCardRefund, UUID> {

    @Query("select coalesce(sum(r.amount), 0) from CreditCardRefund r where r.expense.id = :expenseId")
    BigDecimal sumAmountByExpenseId(@Param("expenseId") UUID expenseId);

    List<CreditCardRefund> findByExpenseIdInOrderByCreatedAtAsc(List<UUID> expenseIds);
}
