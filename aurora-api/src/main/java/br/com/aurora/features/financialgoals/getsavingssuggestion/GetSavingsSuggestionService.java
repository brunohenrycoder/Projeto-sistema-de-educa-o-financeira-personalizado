package br.com.aurora.features.financialgoals.getsavingssuggestion;

import br.com.aurora.features.financialgoals.FinancialGoalsAccess;
import br.com.aurora.features.financialgoals.FinancialGoalsSavingsCalculator;
import br.com.aurora.shared.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GetSavingsSuggestionService {

    private final FinancialGoalsAccess access;
    private final FinancialGoalsSavingsCalculator savingsCalculator;

    @Transactional(readOnly = true)
    public Optional<GetSavingsSuggestionResponse> get() {
        User principal = access.requirePrincipal();
        var average = savingsCalculator.averageRealizedSurplus(
                principal.getFamilyGroup().getId(), YearMonth.now());
        if (average.signum() <= 0) {
            return Optional.empty();
        }
        return Optional.of(new GetSavingsSuggestionResponse(average));
    }
}
