package br.com.aurora.shared.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByFamilyGroupIdOrderByCreatedAtDesc(UUID familyGroupId);

    Optional<Notification> findByFamilyGroupIdAndTypeAndReferenceMonthAndThresholdPercent(
            UUID familyGroupId,
            NotificationType type,
            LocalDate referenceMonth,
            BigDecimal thresholdPercent
    );

    long countByFamilyGroupIdAndTypeAndReferenceMonthAndThresholdPercent(
            UUID familyGroupId,
            NotificationType type,
            LocalDate referenceMonth,
            BigDecimal thresholdPercent
    );

    long countByFamilyGroupIdAndTypeAndPayableBillIdAndNotificationDate(
            UUID familyGroupId,
            NotificationType type,
            UUID payableBillId,
            LocalDate notificationDate
    );

    @Modifying
    @Query(value = """
            INSERT INTO notifications (
                family_group_id, notification_type, description, reference_month,
                threshold_percent, commitment_percent
            ) VALUES (
                :familyGroupId, 'ALERTA_DESPESAS', :description, :referenceMonth,
                :thresholdPercent, :commitmentPercent
            )
            ON CONFLICT (family_group_id, notification_type, reference_month, threshold_percent)
                WHERE reference_month IS NOT NULL
            DO NOTHING
            """, nativeQuery = true)
    int insertExpenseAlertIfAbsent(
            @Param("familyGroupId") UUID familyGroupId,
            @Param("description") String description,
            @Param("referenceMonth") LocalDate referenceMonth,
            @Param("thresholdPercent") BigDecimal thresholdPercent,
            @Param("commitmentPercent") BigDecimal commitmentPercent
    );

    @Modifying
    @Query(value = """
            INSERT INTO notifications (
                family_group_id, notification_type, description, payable_bill_id, notification_date
            ) VALUES (
                :familyGroupId, 'LEMBRETE_VENCIMENTO', :description, :payableBillId, :notificationDate
            )
            ON CONFLICT (family_group_id, notification_type, payable_bill_id, notification_date)
                WHERE payable_bill_id IS NOT NULL
            DO NOTHING
            """, nativeQuery = true)
    int insertPayableBillReminderIfAbsent(
            @Param("familyGroupId") UUID familyGroupId,
            @Param("description") String description,
            @Param("payableBillId") UUID payableBillId,
            @Param("notificationDate") LocalDate notificationDate
    );
}
