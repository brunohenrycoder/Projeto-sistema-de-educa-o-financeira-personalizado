package br.com.aurora.features.creditcards.getcreditcardinvoice;

import br.com.aurora.shared.domain.CreditCardCreditApplicationRepository;
import br.com.aurora.shared.domain.CreditCardInstallment;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.CreditCardInvoice;
import br.com.aurora.shared.domain.CreditCardInvoiceRepository;
import br.com.aurora.shared.domain.CreditCardPaymentRepository;
import br.com.aurora.shared.domain.CreditCardRefundRepository;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.security.CreditCardAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GetCreditCardInvoiceService {

    private final CreditCardAccess access;
    private final CreditCardInvoiceRepository invoiceRepository;
    private final CreditCardInstallmentRepository installmentRepository;
    private final CreditCardPaymentRepository paymentRepository;
    private final CreditCardCreditApplicationRepository creditApplicationRepository;
    private final CreditCardRefundRepository refundRepository;

    @SuppressWarnings("null")
@Transactional(readOnly = true)
    public GetCreditCardInvoiceResponse get(UUID invoiceId) {
        var principal = access.requirePrincipal();
        CreditCardInvoice invoice = invoiceRepository.findByIdAndFamilyGroupId(
                        invoiceId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Fatura não encontrada no grupo familiar."));
        var installments = installmentRepository.findByInvoiceIdOrderByExpenseExpenseDateAscInstallmentNumberAsc(
                invoiceId
        );
        var expenseIds = installments.stream()
                .map(CreditCardInstallment::getExpense)
                .map(expense -> expense.getId())
                .distinct()
                .toList();
        return new GetCreditCardInvoiceResponse(
                invoice.getId(),
                invoice.getCard().getId(),
                invoice.getCycleStart(),
                invoice.getClosingDate(),
                invoice.getDueDate(),
                invoice.getStatus(),
                invoice.getTotalAmount(),
                invoice.getPaidAmount(),
                invoice.getCreditAmount(),
                invoice.getOutstandingAmount(),
                installments
                        .stream()
                        .map(installment -> new GetCreditCardInvoiceResponse.Installment(
                                installment.getId(),
                                installment.getExpense().getId(),
                                installment.getExpense().getUser().getName(),
                                installment.getExpense().getCategory(),
                                installment.getAmount(),
                                installment.getPaidAmount(),
                                installment.getRefundedAmount(),
                                installment.getOutstandingAmount(),
                                installment.getInstallmentNumber(),
                                installment.getInstallmentCount(),
                                installment.isCancelled()
                        ))
                        .toList(),
                paymentRepository.findByInvoiceIdOrderByPaidAtAsc(invoiceId)
                        .stream()
                        .map(payment -> new GetCreditCardInvoiceResponse.Payment(
                                payment.getId(),
                                payment.getAmount(),
                                payment.getPaidAt(),
                                payment.getUser().getName()
                        ))
                        .toList(),
                creditApplicationRepository.findByInvoiceIdOrderByAppliedAtAsc(invoiceId)
                        .stream()
                        .map(application -> new GetCreditCardInvoiceResponse.CreditApplication(
                                application.getId(),
                                application.getCredit().getRefund().getId(),
                                application.getAmount(),
                                application.getCredit().getRemainingAmount(),
                                application.getAppliedAt()
                        ))
                        .toList(),
                expenseIds.isEmpty()
                        ? List.of()
                        : refundRepository.findByExpenseIdInOrderByCreatedAtAsc(expenseIds)
                                .stream()
                                .map(refund -> new GetCreditCardInvoiceResponse.RefundMovement(
                                        refund.getId(),
                                        refund.getExpense().getId(),
                                        refund.getAmount(),
                                        refund.getCreatedAt(),
                                        refund.getUser().getName()
                                ))
                                .toList()
        );
    }
}
