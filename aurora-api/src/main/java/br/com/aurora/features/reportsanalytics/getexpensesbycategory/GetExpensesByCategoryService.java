package br.com.aurora.features.reportsanalytics.getexpensesbycategory;

import br.com.aurora.features.reportsanalytics.ReportsAnalyticsAccess;
import br.com.aurora.shared.domain.FinancialConsumptionCalculator;
import br.com.aurora.shared.domain.FinancialConsumptionItem;
import br.com.aurora.shared.error.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GetExpensesByCategoryService {

    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final LocalDate EARLIEST_DATE = LocalDate.of(1, 1, 1);
    private static final LocalDate LATEST_DATE = LocalDate.of(9999, 12, 31);

    private final ReportsAnalyticsAccess access;
    private final FinancialConsumptionCalculator consumptionCalculator;

    @Transactional(readOnly = true)
    public List<GetExpensesByCategoryResponse> get(GetExpensesByCategoryRequest request) {
        var principal = access.requirePrincipal();
        validate(request);

        LocalDate startDate = request.startDate() == null ? EARLIEST_DATE : request.startDate();
        LocalDate endDate = request.endDate() == null ? LATEST_DATE : request.endDate();
        @SuppressWarnings("null")
        Map<String, BigDecimal> totals = consumptionCalculator.findConsumptionItems(
                        principal.getFamilyGroup().getId(), startDate, endDate)
                .stream()
                .filter(item -> matches(item, request.category(), request.memberId()))
                .collect(Collectors.groupingBy(
                        FinancialConsumptionItem::category,
                        Collectors.mapping(
                                FinancialConsumptionItem::amount,
                                Collectors.reducing(ZERO, BigDecimal::add)
                        )
                ));

        return totals.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(entry -> new GetExpensesByCategoryResponse(entry.getKey(), entry.getValue()))
                .toList();
    }

    private boolean matches(FinancialConsumptionItem item, String category, UUID memberId) {
        return (category == null || category.isBlank()
                || item.category().equalsIgnoreCase(category.trim()))
                && (memberId == null || item.userId().equals(memberId));
    }

    private void validate(GetExpensesByCategoryRequest request) {
        if (request.startDate() != null && request.endDate() != null
                && request.startDate().isAfter(request.endDate())) {
            throw new ValidationException("A data inicial não pode ser posterior à data final.");
        }
        if (request.category() != null && request.category().length() > 50) {
            throw new ValidationException("A categoria pode ter no máximo 50 caracteres.");
        }
    }
}
