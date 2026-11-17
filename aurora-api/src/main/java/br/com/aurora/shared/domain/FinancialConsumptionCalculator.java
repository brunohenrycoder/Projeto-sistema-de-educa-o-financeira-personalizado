package br.com.aurora.shared.domain;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FinancialConsumptionCalculator {

    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private final FinancialOverviewDataRepository dataRepository;

    public List<FinancialConsumptionItem> findConsumptionItems(
            UUID familyGroupId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        List<FinancialConsumptionItem> items = new ArrayList<>();

        for (Expense expense : dataRepository.findActiveExpenses(familyGroupId, startDate, endDate)) {
            if (expense.getPaymentMethod() != ExpensePaymentMethod.CARTAO_CREDITO) {
                items.add(new FinancialConsumptionItem(
                        expense.getUser().getId(),
                        expense.getUser().getName(),
                        expense.getCategory(),
                        expense.getAmount()
                ));
            }
        }

        for (CreditCardInstallment installment
                : dataRepository.findInstallmentsDue(familyGroupId, startDate, endDate)) {
            BigDecimal amount = installment.getAmount()
                    .subtract(installment.getRefundedAmount())
                    .max(ZERO);
            items.add(new FinancialConsumptionItem(
                    installment.getExpense().getUser().getId(),
                    installment.getExpense().getUser().getName(),
                    installment.getExpense().getCategory(),
                    amount
            ));
        }

        for (CreditCardRefund refund : dataRepository.findRefunds(familyGroupId, startDate, endDate)) {
            Expense expense = refund.getExpense();
            items.add(new FinancialConsumptionItem(
                    expense.getUser().getId(),
                    expense.getUser().getName(),
                    expense.getCategory(),
                    refund.getAmount().negate()
            ));
        }

        return List.copyOf(items);
    }
}
