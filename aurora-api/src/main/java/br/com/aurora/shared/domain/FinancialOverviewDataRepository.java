package br.com.aurora.shared.domain;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class FinancialOverviewDataRepository {

    private final EntityManager entityManager;

    public List<Receivable> findExpectedReceivables(UUID familyGroupId, YearMonth month) {
        return entityManager.createQuery("""
                        select r from Receivable r
                        where r.familyGroup.id = :familyGroupId
                          and r.status in :statuses
                          and r.expectedDate between :startDate and :endDate
                        """, Receivable.class)
                .setParameter("familyGroupId", familyGroupId)
                .setParameter("statuses", List.of(ReceivableStatus.PENDENTE, ReceivableStatus.ATRASADA))
                .setParameter("startDate", month.atDay(1))
                .setParameter("endDate", month.atEndOfMonth())
                .getResultList();
    }

    public List<ReceivableConfirmation> findReceivedReceivables(UUID familyGroupId, YearMonth month) {
        return entityManager.createQuery("""
                        select c from ReceivableConfirmation c
                        join fetch c.receivable r
                        where r.familyGroup.id = :familyGroupId
                          and r.status = :status
                          and c.receivedDate between :startDate and :endDate
                        """, ReceivableConfirmation.class)
                .setParameter("familyGroupId", familyGroupId)
                .setParameter("status", ReceivableStatus.RECEBIDA)
                .setParameter("startDate", month.atDay(1))
                .setParameter("endDate", month.atEndOfMonth())
                .getResultList();
    }

    public List<Expense> findActiveExpenses(UUID familyGroupId, YearMonth month) {
        return entityManager.createQuery("""
                        select e from Expense e
                        where e.familyGroup.id = :familyGroupId
                          and e.status = :status
                          and e.expenseDate between :startDate and :endDate
                        """, Expense.class)
                .setParameter("familyGroupId", familyGroupId)
                .setParameter("status", ExpenseStatus.ATIVO)
                .setParameter("startDate", month.atDay(1))
                .setParameter("endDate", month.atEndOfMonth())
                .getResultList();
    }

    public List<Expense> findDirectCashExpenses(UUID familyGroupId, YearMonth month) {
        return entityManager.createQuery("""
                        select e from Expense e
                        where e.familyGroup.id = :familyGroupId
                          and e.status = :status
                          and e.paymentMethod <> :creditCard
                          and e.expenseDate between :startDate and :endDate
                          and not exists (
                              select p.id from PayableBillPayment p where p.expense.id = e.id
                          )
                        """, Expense.class)
                .setParameter("familyGroupId", familyGroupId)
                .setParameter("status", ExpenseStatus.ATIVO)
                .setParameter("creditCard", ExpensePaymentMethod.CARTAO_CREDITO)
                .setParameter("startDate", month.atDay(1))
                .setParameter("endDate", month.atEndOfMonth())
                .getResultList();
    }

    public List<PayableBill> findExpectedBills(UUID familyGroupId, YearMonth month) {
        return entityManager.createQuery("""
                        select b from PayableBill b
                        where b.familyGroup.id = :familyGroupId
                          and b.status in :statuses
                          and b.dueDate between :startDate and :endDate
                        """, PayableBill.class)
                .setParameter("familyGroupId", familyGroupId)
                .setParameter("statuses", List.of(PayableBillStatus.PENDENTE, PayableBillStatus.ATRASADA))
                .setParameter("startDate", month.atDay(1))
                .setParameter("endDate", month.atEndOfMonth())
                .getResultList();
    }

    public List<PayableBillPayment> findPaidBillPayments(UUID familyGroupId, YearMonth month) {
        return entityManager.createQuery("""
                        select p from PayableBillPayment p
                        join fetch p.bill b
                        join fetch p.expense e
                        where b.familyGroup.id = :familyGroupId
                          and b.status = :status
                          and p.paymentDate between :startDate and :endDate
                        """, PayableBillPayment.class)
                .setParameter("familyGroupId", familyGroupId)
                .setParameter("status", PayableBillStatus.PAGA)
                .setParameter("startDate", month.atDay(1))
                .setParameter("endDate", month.atEndOfMonth())
                .getResultList();
    }

    public List<CreditCardInvoice> findInvoicesDue(UUID familyGroupId, YearMonth month) {
        return entityManager.createQuery("""
                        select i from CreditCardInvoice i
                        where i.familyGroup.id = :familyGroupId
                          and i.dueDate between :startDate and :endDate
                        """, CreditCardInvoice.class)
                .setParameter("familyGroupId", familyGroupId)
                .setParameter("startDate", month.atDay(1))
                .setParameter("endDate", month.atEndOfMonth())
                .getResultList();
    }

    public List<CreditCardPayment> findCardPayments(UUID familyGroupId, YearMonth month) {
        LocalDateTime start = month.atDay(1).atStartOfDay();
        LocalDateTime endExclusive = month.plusMonths(1).atDay(1).atStartOfDay();
        return entityManager.createQuery("""
                        select p from CreditCardPayment p
                        join fetch p.invoice i
                        where i.familyGroup.id = :familyGroupId
                          and p.paidAt >= :start and p.paidAt < :endExclusive
                        """, CreditCardPayment.class)
                .setParameter("familyGroupId", familyGroupId)
                .setParameter("start", start)
                .setParameter("endExclusive", endExclusive)
                .getResultList();
    }

    public List<CreditCardInstallment> findInstallmentsDue(UUID familyGroupId, YearMonth month) {
        return entityManager.createQuery("""
                        select i from CreditCardInstallment i
                        join fetch i.invoice invoice
                        join fetch i.expense expense
                        where invoice.familyGroup.id = :familyGroupId
                          and invoice.dueDate between :startDate and :endDate
                          and i.cancelled = false
                          and expense.status = :expenseStatus
                        """, CreditCardInstallment.class)
                .setParameter("familyGroupId", familyGroupId)
                .setParameter("startDate", month.atDay(1))
                .setParameter("endDate", month.atEndOfMonth())
                .setParameter("expenseStatus", ExpenseStatus.ATIVO)
                .getResultList();
    }

    public List<CreditCardRefund> findRefunds(UUID familyGroupId, YearMonth month) {
        LocalDateTime start = month.atDay(1).atStartOfDay();
        LocalDateTime endExclusive = month.plusMonths(1).atDay(1).atStartOfDay();
        return entityManager.createQuery("""
                        select r from CreditCardRefund r
                        join fetch r.expense e
                        where e.familyGroup.id = :familyGroupId
                          and e.status = :expenseStatus
                          and r.createdAt >= :start and r.createdAt < :endExclusive
                        """, CreditCardRefund.class)
                .setParameter("familyGroupId", familyGroupId)
                .setParameter("expenseStatus", ExpenseStatus.ATIVO)
                .setParameter("start", start)
                .setParameter("endExclusive", endExclusive)
                .getResultList();
    }
}
