package br.com.aurora.shared.domain;

import jakarta.persistence.LockModeType;
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
public interface CreditCardInvoiceRepository extends JpaRepository<CreditCardInvoice, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from CreditCardInvoice i where i.card.id = :cardId and i.cycleStart = :cycleStart")
    Optional<CreditCardInvoice> findByCardIdAndCycleStartForUpdate(
            @Param("cardId") UUID cardId,
            @Param("cycleStart") LocalDate cycleStart
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from CreditCardInvoice i where i.card.id = :cardId and i.status = :status "
            + "order by i.closingDate asc")
    List<CreditCardInvoice> findOpenForUpdate(
            @Param("cardId") UUID cardId,
            @Param("status") CreditCardInvoiceStatus status
    );

    List<CreditCardInvoice> findByFamilyGroupIdOrderByClosingDateDesc(UUID familyGroupId);

    Optional<CreditCardInvoice> findByIdAndFamilyGroupId(UUID id, UUID familyGroupId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from CreditCardInvoice i where i.id = :id and i.familyGroup.id = :familyGroupId")
    Optional<CreditCardInvoice> findLockedByIdAndFamilyGroupId(
            @Param("id") UUID id,
            @Param("familyGroupId") UUID familyGroupId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from CreditCardInvoice i where i.id in "
            + "(select x.invoice.id from CreditCardInstallment x where x.expense.id = :expenseId) "
            + "order by i.dueDate asc")
    List<CreditCardInvoice> findByExpenseForUpdate(@Param("expenseId") UUID expenseId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from CreditCardInvoice i where i.status in :statuses and "
            + "(i.closingDate <= :today or i.dueDate < :today)")
    List<CreditCardInvoice> findInvoicesToRefresh(
            @Param("statuses") List<CreditCardInvoiceStatus> statuses,
            @Param("today") LocalDate today
    );
}
