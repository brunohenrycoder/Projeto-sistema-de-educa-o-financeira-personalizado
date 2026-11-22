package br.com.aurora.features.notifications.checkfinancialoverviewalerts;

import br.com.aurora.shared.domain.FinancialOverviewCalculator;
import br.com.aurora.shared.domain.FinancialOverviewPolicy;
import br.com.aurora.shared.domain.FinancialOverviewTotals;
import br.com.aurora.shared.domain.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CheckFinancialOverviewAlertsService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final FinancialOverviewCalculator calculator;
    private final NotificationRepository notificationRepository;

    @Transactional
    public void checkFamily(UUID familyGroupId, YearMonth month) {
        FinancialOverviewTotals totals = calculator.calculate(familyGroupId, month);
        if (totals.incomeConsidered().signum() <= 0
                || totals.expensesConsidered().multiply(HUNDRED)
                        .compareTo(totals.incomeConsidered()
                                .multiply(FinancialOverviewPolicy.ALERT_THRESHOLD_PERCENT)) < 0) {
            return;
        }

        BigDecimal commitmentPercent = totals.expensesConsidered().multiply(HUNDRED)
                .divide(totals.incomeConsidered(), 2, RoundingMode.HALF_UP);
        String description = "As despesas familiares atingiram " + commitmentPercent
                + "% da renda no período; o limite é 80%.";
        notificationRepository.insertExpenseAlertIfAbsent(
                familyGroupId,
                description,
                month.atDay(1),
                FinancialOverviewPolicy.ALERT_THRESHOLD_PERCENT,
                commitmentPercent
        );
    }
}
