package br.com.aurora.features.reportsanalytics;

import br.com.aurora.shared.domain.ExpenseStatus;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class ReportsAnalyticsHistoryRepository {

    private static final int MAX_HISTORY_MONTHS = 3;

    private final EntityManager entityManager;

    public List<YearMonth> findAvailableMonthsBefore(UUID familyGroupId, YearMonth analyzedMonth) {
        return entityManager.createQuery("""
                        select distinct e.expenseDate from Expense e
                        where e.familyGroup.id = :familyGroupId
                          and e.status = :status
                          and e.expenseDate < :dateExclusive
                        """, LocalDate.class)
                .setParameter("familyGroupId", familyGroupId)
                .setParameter("status", ExpenseStatus.ATIVO)
                .setParameter("dateExclusive", analyzedMonth.atDay(1))
                .getResultList()
                .stream()
                .map(YearMonth::from)
                .distinct()
                .sorted(Comparator.reverseOrder())
                .limit(MAX_HISTORY_MONTHS)
                .toList();
    }
}
