package br.com.aurora.features.financialgoals.listfinancialgoals;

import br.com.aurora.features.financialgoals.FinancialGoalsAccess;
import br.com.aurora.shared.domain.FinancialGoalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ListFinancialGoalsService {

    private final FinancialGoalsAccess access;
    private final FinancialGoalRepository repository;

    @Transactional(readOnly = true)
    public List<ListFinancialGoalsResponse> list() {
        var principal = access.requirePrincipal();
        return repository.findAllByFamilyGroupIdOrderByCreatedAtDesc(principal.getFamilyGroup().getId())
                .stream()
                .map(goal -> new ListFinancialGoalsResponse(
                        goal.getId(), goal.getTargetAmount(), goal.getCreatedAt()))
                .toList();
    }
}
