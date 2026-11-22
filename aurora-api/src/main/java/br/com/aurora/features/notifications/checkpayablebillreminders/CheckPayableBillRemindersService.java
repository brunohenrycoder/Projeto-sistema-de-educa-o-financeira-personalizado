package br.com.aurora.features.notifications.checkpayablebillreminders;

import br.com.aurora.shared.domain.NotificationRepository;
import br.com.aurora.shared.domain.PayableBill;
import br.com.aurora.shared.domain.PayableBillRepository;
import br.com.aurora.shared.domain.PayableBillStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CheckPayableBillRemindersService {

    private static final int REMINDER_DAYS_IN_ADVANCE = 3;

    private final PayableBillRepository payableBillRepository;
    private final NotificationRepository notificationRepository;

    @Transactional
    public void checkFamily(UUID familyGroupId, LocalDate today) {
        List<PayableBill> bills = payableBillRepository
                .findByFamilyGroupIdAndStatusInAndDueDateLessThanEqualOrderByDueDateAsc(
                        familyGroupId,
                        List.of(PayableBillStatus.PENDENTE, PayableBillStatus.ATRASADA),
                        today.plusDays(REMINDER_DAYS_IN_ADVANCE)
                );

        for (PayableBill bill : bills) {
            if (!isReminderDay(bill.getDueDate(), today)) {
                continue;
            }
            notificationRepository.insertPayableBillReminderIfAbsent(
                    familyGroupId,
                    createDescription(bill, today),
                    bill.getId(),
                    today
            );
        }
    }

    private boolean isReminderDay(LocalDate dueDate, LocalDate today) {
        return dueDate.isBefore(today)
                || (dueDate.isAfter(today) && !dueDate.isAfter(today.plusDays(REMINDER_DAYS_IN_ADVANCE)));
    }

    private String createDescription(PayableBill bill, LocalDate today) {
        if (bill.getDueDate().isBefore(today)) {
            return "A conta \"" + bill.getDescription() + "\" está atrasada desde " + bill.getDueDate() + ".";
        }
        return "A conta \"" + bill.getDescription() + "\" vence em " + bill.getDueDate() + ".";
    }
}
