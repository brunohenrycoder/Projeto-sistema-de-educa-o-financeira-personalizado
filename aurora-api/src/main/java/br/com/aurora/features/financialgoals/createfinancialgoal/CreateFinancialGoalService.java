package br.com.aurora.features.financialgoals.createfinancialgoal;

import br.com.aurora.features.financialgoals.FinancialGoalsAccess;
import br.com.aurora.shared.domain.FinancialGoal;
import br.com.aurora.shared.domain.FinancialGoalRepository;
import br.com.aurora.shared.error.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CreateFinancialGoalService {

    private final FinancialGoalsAccess access;
    private final FinancialGoalRepository repository;

    @Transactional
    public CreateFinancialGoalResponse confirm(CreateFinancialGoalRequest request) {
        var principal = access.requirePrincipal();
        if (request == null || request.targetAmount() == null
                || request.targetAmount().signum() <= 0
                || request.targetAmount().scale() > 2
                || request.targetAmount().precision() - request.targetAmount().scale() > 10) {
            throw new ValidationException("O valor-alvo deve ser positivo e ter no máximo duas casas decimais.");
        }

        FinancialGoal goal = repository.save(FinancialGoal.builder()
                .familyGroup(principal.getFamilyGroup())
                .createdBy(principal)
                .targetAmount(request.targetAmount())
                .build());
        return new CreateFinancialGoalResponse(goal.getId(), goal.getTargetAmount(), goal.getCreatedAt());
    }
}
