package br.com.aurora.features.notifications.checkpayablebillreminders;

import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class CheckPayableBillRemindersScheduler {

    private final UserRepository userRepository;
    private final CheckPayableBillRemindersService service;

    @Scheduled(cron = "0 20 0 * * *")
    public void checkDailyReminders() {
        LocalDate today = LocalDate.now();
        for (var familyGroupId : userRepository.findActivePrincipalFamilyGroupIds(
                Role.PRINCIPAL, UserStatus.ATIVO)) {
            service.checkFamily(familyGroupId, today);
        }
    }
}
