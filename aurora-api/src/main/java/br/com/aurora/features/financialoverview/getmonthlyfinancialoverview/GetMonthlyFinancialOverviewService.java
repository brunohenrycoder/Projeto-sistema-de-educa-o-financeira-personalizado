package br.com.aurora.features.financialoverview.getmonthlyfinancialoverview;

import br.com.aurora.features.financialoverview.FinancialOverviewAlertRepository;
import br.com.aurora.features.financialoverview.FinancialOverviewCalculator;
import br.com.aurora.features.financialoverview.FinancialOverviewPolicy;
import br.com.aurora.features.financialoverview.FinancialOverviewTotals;
import br.com.aurora.shared.domain.FinancialOverviewAlert;
import br.com.aurora.shared.error.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.YearMonth;

@Service
@RequiredArgsConstructor
public class GetMonthlyFinancialOverviewService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final FinancialOverviewAccess access;
    private final FinancialOverviewCalculator calculator;
    private final FinancialOverviewAlertRepository alertRepository;

    @Transactional(readOnly = true)
    public GetMonthlyFinancialOverviewResponse get(String requestedMonth) {
        var principal = access.requirePrincipal();
        YearMonth month = parseMonth(requestedMonth);
        FinancialOverviewTotals totals = calculator.calculate(principal.getFamilyGroup().getId(), month);
        BigDecimal commitmentPercent = totals.incomeConsidered().signum() == 0
                ? null
                : totals.expensesConsidered().multiply(HUNDRED)
                        .divide(totals.incomeConsidered(), 2, RoundingMode.HALF_UP);
        boolean thresholdReached = totals.incomeConsidered().signum() > 0
                && totals.expensesConsidered().multiply(HUNDRED)
                        .compareTo(totals.incomeConsidered()
                                .multiply(FinancialOverviewPolicy.ALERT_THRESHOLD_PERCENT)) >= 0;
        FinancialOverviewAlert alert = alertRepository
                .findByFamilyGroupIdAndReferenceMonthAndThresholdPercent(
                        principal.getFamilyGroup().getId(),
                        month.atDay(1),
                        FinancialOverviewPolicy.ALERT_THRESHOLD_PERCENT)
                .orElse(null);

        return new GetMonthlyFinancialOverviewResponse(
                month,
                totals.realizedIncome(),
                totals.plannedIncome(),
                totals.realizedExpenses(),
                totals.plannedExpenses(),
                totals.projectedBalance(),
                totals.incomeConsidered(),
                totals.expensesConsidered(),
                commitmentPercent,
                FinancialOverviewPolicy.ALERT_THRESHOLD_PERCENT,
                thresholdReached,
                alert == null ? null : toAlertResponse(alert)
        );
    }

    private YearMonth parseMonth(String requestedMonth) {
        if (requestedMonth == null) {
            return YearMonth.now();
        }
        try {
            return YearMonth.parse(requestedMonth);
        } catch (DateTimeException exception) {
            throw new ValidationException("O período deve estar no formato AAAA-MM.");
        }
    }

    private GetMonthlyFinancialOverviewResponse.Alert toAlertResponse(FinancialOverviewAlert alert) {
        return new GetMonthlyFinancialOverviewResponse.Alert(
                alert.getId(),
                alert.getReferenceMonth(),
                alert.getThresholdPercent(),
                alert.getCommitmentPercent(),
                alert.getCreatedAt()
        );
    }
}
