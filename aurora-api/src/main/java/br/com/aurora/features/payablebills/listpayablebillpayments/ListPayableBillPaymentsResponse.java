package br.com.aurora.features.payablebills.listpayablebillpayments;

import br.com.aurora.shared.domain.ExpensePaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ListPayableBillPaymentsResponse(List<PaymentItem> payments) {

    public record PaymentItem(
            UUID id,
            UUID payableBillId,
            UUID expenseId,
            BigDecimal amount,
            LocalDate paymentDate,
            ExpensePaymentMethod paymentMethod,
            UUID paidByUserId,
            String paidByName,
            LocalDateTime createdAt
    ) {
    }
}
