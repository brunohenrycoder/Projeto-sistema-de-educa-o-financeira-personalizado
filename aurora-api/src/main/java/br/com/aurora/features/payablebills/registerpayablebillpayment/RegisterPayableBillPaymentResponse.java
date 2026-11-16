package br.com.aurora.features.payablebills.registerpayablebillpayment;

import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.PayableBillStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record RegisterPayableBillPaymentResponse(
        UUID paymentId,
        UUID payableBillId,
        UUID expenseId,
        BigDecimal amount,
        LocalDate paymentDate,
        ExpensePaymentMethod paymentMethod,
        PayableBillStatus status
) {
}
