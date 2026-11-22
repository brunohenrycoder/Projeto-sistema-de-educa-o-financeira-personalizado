package br.com.aurora.features.reportsanalytics.getexpensesbymember;

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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GetExpensesByMemberService {

    private static final LocalDate EARLIEST_DATE = LocalDate.of(1, 1, 1);
    private static final LocalDate LATEST_DATE = LocalDate.of(9999, 12, 31);

    private final ReportsAnalyticsAccess access;
    private final FinancialConsumptionCalculator consumptionCalculator;

    @SuppressWarnings("null")
    @Transactional(readOnly = true)
    public List<GetExpensesByMemberResponse> get(GetExpensesByMemberRequest request) {
        var principal = access.requirePrincipal();
        validate(request);

        LocalDate startDate = request.startDate() == null ? EARLIEST_DATE : request.startDate();
        LocalDate endDate = request.endDate() == null ? LATEST_DATE : request.endDate();
        Map<UUID, MemberTotal> totals = new LinkedHashMap<>();
        for (FinancialConsumptionItem item : consumptionCalculator.findConsumptionItems(
                principal.getFamilyGroup().getId(), startDate, endDate)) {
            if (!matches(item, request.category(), request.memberId())) {
                continue;
            }
            totals.compute(item.userId(), (id, current) -> current == null
                    ? new MemberTotal(item.userName(), item.amount())
                    : new MemberTotal(current.name(), current.amount().add(item.amount())));
        }

        return totals.entrySet().stream()
                .sorted(Map.Entry.<UUID, MemberTotal>comparingByValue(
                                Comparator.comparing(MemberTotal::amount).reversed()
                                        .thenComparing(MemberTotal::name, String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(entry -> new GetExpensesByMemberResponse(
                        entry.getKey(), entry.getValue().name(), entry.getValue().amount()))
                .toList();
    }

    private boolean matches(FinancialConsumptionItem item, String category, UUID memberId) {
        return (category == null || category.isBlank()
                || item.category().equalsIgnoreCase(category.trim()))
                && (memberId == null || item.userId().equals(memberId));
    }

    private void validate(GetExpensesByMemberRequest request) {
        if (request.startDate() != null && request.endDate() != null
                && request.startDate().isAfter(request.endDate())) {
            throw new ValidationException("A data inicial não pode ser posterior à data final.");
        }
        if (request.category() != null && request.category().length() > 50) {
            throw new ValidationException("A categoria pode ter no máximo 50 caracteres.");
        }
    }

    private record MemberTotal(String name, BigDecimal amount) {
    }
}
