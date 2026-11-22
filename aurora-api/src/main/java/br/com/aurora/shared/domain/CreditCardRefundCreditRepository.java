package br.com.aurora.shared.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface CreditCardRefundCreditRepository extends JpaRepository<CreditCardRefundCredit, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<CreditCardRefundCredit> findByCardIdAndRemainingAmountGreaterThanOrderByIdAsc(
            UUID cardId,
            BigDecimal remainingAmount
    );

    @Query("select coalesce(sum(c.remainingAmount), 0) from CreditCardRefundCredit c "
            + "where c.card.id = :cardId")
    BigDecimal sumPendingAmountByCardId(@Param("cardId") UUID cardId);
}
