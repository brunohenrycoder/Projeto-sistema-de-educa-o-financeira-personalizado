package br.com.aurora.features.notifications.checkfinancialoverviewalerts;

import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.UserRepository;
import br.com.aurora.shared.domain.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;

@Component
@RequiredArgsConstructor
public class CheckFinancialOverviewAlertsScheduler {

    private final UserRepository userRepository;
    private final CheckFinancialOverviewAlertsService service;

    @Scheduled(cron = "0 35 0 * * *")
    public void checkCurrentMonth() {
        YearMonth currentMonth = YearMonth.now();
        for (var familyGroupId : userRepository.findActivePrincipalFamilyGroupIds(
                Role.PRINCIPAL, UserStatus.ATIVO)) {
            service.checkFamily(familyGroupId, currentMonth);
        }
    }
}
