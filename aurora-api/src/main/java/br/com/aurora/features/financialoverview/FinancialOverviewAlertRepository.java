package br.com.aurora.features.financialoverview;

import br.com.aurora.shared.domain.FinancialOverviewAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FinancialOverviewAlertRepository extends JpaRepository<FinancialOverviewAlert, UUID> {

    Optional<FinancialOverviewAlert> findByFamilyGroupIdAndReferenceMonthAndThresholdPercent(
            UUID familyGroupId,
            LocalDate referenceMonth,
            BigDecimal thresholdPercent
    );

    long countByFamilyGroupIdAndReferenceMonthAndThresholdPercent(
            UUID familyGroupId,
            LocalDate referenceMonth,
            BigDecimal thresholdPercent
    );

    @Modifying
    @Query(value = """
            INSERT INTO financial_overview_alerts (
                family_group_id, reference_month, threshold_percent, commitment_percent
            ) VALUES (
                :familyGroupId, :referenceMonth, :thresholdPercent, :commitmentPercent
            )
            ON CONFLICT (family_group_id, reference_month, threshold_percent) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(
            @Param("familyGroupId") UUID familyGroupId,
            @Param("referenceMonth") LocalDate referenceMonth,
            @Param("thresholdPercent") BigDecimal thresholdPercent,
            @Param("commitmentPercent") BigDecimal commitmentPercent
    );
}
