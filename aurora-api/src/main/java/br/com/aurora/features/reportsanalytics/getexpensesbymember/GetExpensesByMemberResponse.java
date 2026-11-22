package br.com.aurora.features.reportsanalytics.getexpensesbymember;

import java.math.BigDecimal;
import java.util.UUID;

public record GetExpensesByMemberResponse(
        UUID memberId,
        String memberName,
        BigDecimal totalAmount
) {
}
