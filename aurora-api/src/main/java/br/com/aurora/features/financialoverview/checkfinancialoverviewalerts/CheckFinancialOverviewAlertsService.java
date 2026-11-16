package br.com.aurora.features.financialoverview.checkfinancialoverviewalerts;

import br.com.aurora.features.financialoverview.FinancialOverviewAlertRepository;
import br.com.aurora.features.financialoverview.FinancialOverviewCalculator;
import br.com.aurora.features.financialoverview.FinancialOverviewPolicy;
import br.com.aurora.features.financialoverview.FinancialOverviewTotals;
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
    private final FinancialOverviewAlertRepository alertRepository;

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
        alertRepository.insertIfAbsent(
                familyGroupId,
                month.atDay(1),
                FinancialOverviewPolicy.ALERT_THRESHOLD_PERCENT,
                commitmentPercent
        );
    }
}
