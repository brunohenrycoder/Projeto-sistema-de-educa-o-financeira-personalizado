package br.com.aurora.features.reportsanalytics.getspendingpatterns;

import br.com.aurora.features.reportsanalytics.ReportsAnalyticsAccess;
import br.com.aurora.features.reportsanalytics.ReportMonthParser;
import br.com.aurora.features.reportsanalytics.ReportsAnalyticsHistoryRepository;
import br.com.aurora.shared.domain.FinancialConsumptionCalculator;
import br.com.aurora.shared.domain.FinancialConsumptionItem;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.error.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GetSpendingPatternsService {

    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final int SCALE = 2;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
    private static final int MIN_HISTORY_MONTHS = 2;
    private static final int TOP_CATEGORY_COUNT = 3;

    private final ReportsAnalyticsAccess access;
    private final ReportsAnalyticsHistoryRepository historyRepository;
    private final FinancialConsumptionCalculator consumptionCalculator;

    @SuppressWarnings("null")
@Transactional(readOnly = true)
    public GetSpendingPatternsResponse get(GetSpendingPatternsRequest request) {
        User principal = access.requirePrincipal();
        YearMonth month = ReportMonthParser.parseRequired(request.month());
        validateCategory(request.category());

        List<YearMonth> historyMonths = historyRepository.findAvailableMonthsBefore(
                principal.getFamilyGroup().getId(), month);
        if (historyMonths.size() < MIN_HISTORY_MONTHS) {
            return new GetSpendingPatternsResponse(month, false, historyMonths.size(), List.of());
        }

        Map<String, BigDecimal> currentTotals = totalsByCategory(
                itemsForMonth(principal, month, request.category(), request.memberId()));
        Map<String, BigDecimal> historicalTotals = new HashMap<>();
        for (YearMonth historyMonth : historyMonths) {
            totalsByCategory(itemsForMonth(principal, historyMonth, request.category(), request.memberId()))
                    .forEach((category, amount) ->
                            historicalTotals.merge(category, amount, BigDecimal::add));
        }

        List<Map.Entry<String, BigDecimal>> ranked = currentTotals.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(Map.Entry.comparingByKey()))
                .toList();
        List<GetSpendingPatternsResponse.CategoryPattern> topCategories = topCategories(
                ranked, historicalTotals, historyMonths.size());
        return new GetSpendingPatternsResponse(month, true, historyMonths.size(), topCategories);
    }

    private List<GetSpendingPatternsResponse.CategoryPattern> topCategories(
            List<Map.Entry<String, BigDecimal>> ranked,
            Map<String, BigDecimal> historicalTotals,
            int monthCount
    ) {
        if (ranked.isEmpty()) {
            return List.of();
        }
        int includedCount = Math.min(TOP_CATEGORY_COUNT, ranked.size());
        BigDecimal cutoff = ranked.get(includedCount - 1).getValue();
        return ranked.stream()
                .takeWhile(entry -> entry.getValue().compareTo(cutoff) >= 0)
                .map(entry -> {
                    BigDecimal historyTotal = historicalTotals.getOrDefault(entry.getKey(), ZERO);
                    return new GetSpendingPatternsResponse.CategoryPattern(
                            entry.getKey(),
                            entry.getValue(),
                            average(historyTotal, monthCount),
                            variation(entry.getValue(), historyTotal, monthCount)
                    );
                })
                .toList();
    }

    private List<FinancialConsumptionItem> itemsForMonth(
            User principal,
            YearMonth month,
            String category,
            UUID memberId
    ) {
        return consumptionCalculator.findConsumptionItems(
                        principal.getFamilyGroup().getId(), month.atDay(1), month.atEndOfMonth())
                .stream()
                .filter(item -> category == null || category.isBlank()
                        || item.category().equalsIgnoreCase(category.trim()))
                .filter(item -> memberId == null || item.userId().equals(memberId))
                .toList();
    }

    @SuppressWarnings("null")
private Map<String, BigDecimal> totalsByCategory(List<FinancialConsumptionItem> items) {
        return items.stream().collect(Collectors.groupingBy(
                FinancialConsumptionItem::category,
                Collectors.mapping(
                        FinancialConsumptionItem::amount,
                        Collectors.reducing(ZERO, BigDecimal::add)
                )
        ));
    }

    private BigDecimal average(BigDecimal historicalTotal, int monthCount) {
        return historicalTotal.divide(BigDecimal.valueOf(monthCount), SCALE, ROUNDING);
    }

    private BigDecimal variation(BigDecimal currentAmount, BigDecimal historicalTotal, int monthCount) {
        if (historicalTotal.signum() == 0) {
            return null;
        }
        return currentAmount.multiply(BigDecimal.valueOf(monthCount))
                .subtract(historicalTotal)
                .multiply(HUNDRED)
                .divide(historicalTotal, SCALE, ROUNDING);
    }

    private void validateCategory(String category) {
        if (category != null && category.length() > 50) {
            throw new ValidationException("A categoria pode ter no máximo 50 caracteres.");
        }
    }
}
