package br.com.aurora.features.reportsanalytics.getcategoryvariations;

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
public class GetCategoryVariationsService {

    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal THRESHOLD_MULTIPLIER = new BigDecimal("120");
    private static final int SCALE = 2;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
    private static final int MIN_HISTORY_MONTHS = 2;

    private final ReportsAnalyticsAccess access;
    private final ReportsAnalyticsHistoryRepository historyRepository;
    private final FinancialConsumptionCalculator consumptionCalculator;

    @SuppressWarnings("null")
@Transactional(readOnly = true)
    public GetCategoryVariationsResponse get(GetCategoryVariationsRequest request) {
        User principal = access.requirePrincipal();
        YearMonth month = ReportMonthParser.parseRequired(request.month());
        validateCategory(request.category());

        List<YearMonth> historyMonths = historyRepository.findAvailableMonthsBefore(
                principal.getFamilyGroup().getId(), month);
        if (historyMonths.size() < MIN_HISTORY_MONTHS) {
            return new GetCategoryVariationsResponse(month, false, historyMonths.size(), List.of());
        }

        Map<String, BigDecimal> currentTotals = totalsByCategory(
                itemsForMonth(principal, month, request.category(), request.memberId()));
        Map<String, BigDecimal> historicalTotals = new HashMap<>();
        for (YearMonth historyMonth : historyMonths) {
            totalsByCategory(itemsForMonth(principal, historyMonth, request.category(), request.memberId()))
                    .forEach((category, amount) ->
                            historicalTotals.merge(category, amount, BigDecimal::add));
        }

        List<GetCategoryVariationsResponse.CategoryVariation> variations = currentTotals.entrySet().stream()
                .filter(entry -> {
                    BigDecimal historyTotal = historicalTotals.getOrDefault(entry.getKey(), ZERO);
                    return historyTotal.signum() > 0
                            && entry.getValue().multiply(BigDecimal.valueOf(historyMonths.size()))
                                    .multiply(HUNDRED)
                                    .compareTo(historyTotal.multiply(THRESHOLD_MULTIPLIER)) > 0;
                })
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(entry -> {
                    BigDecimal historyTotal = historicalTotals.get(entry.getKey());
                    return new GetCategoryVariationsResponse.CategoryVariation(
                            entry.getKey(),
                            entry.getValue(),
                            historyTotal.divide(BigDecimal.valueOf(historyMonths.size()), SCALE, ROUNDING),
                            entry.getValue().multiply(BigDecimal.valueOf(historyMonths.size()))
                                    .subtract(historyTotal)
                                    .multiply(HUNDRED)
                                    .divide(historyTotal, SCALE, ROUNDING)
                    );
                })
                .toList();

        return new GetCategoryVariationsResponse(month, true, historyMonths.size(), variations);
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

    private void validateCategory(String category) {
        if (category != null && category.length() > 50) {
            throw new ValidationException("A categoria pode ter no máximo 50 caracteres.");
        }
    }
}
