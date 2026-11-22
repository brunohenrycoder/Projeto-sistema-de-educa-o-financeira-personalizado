package br.com.aurora.features.creditcards.registercreditcardrefund;

import br.com.aurora.shared.domain.CreditCard;
import br.com.aurora.shared.domain.CreditCardInstallment;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.CreditCardInvoice;
import br.com.aurora.shared.domain.CreditCardLedger;
import br.com.aurora.shared.domain.CreditCardRefund;
import br.com.aurora.shared.domain.CreditCardRefundAllocation;
import br.com.aurora.shared.domain.CreditCardRefundAllocationRepository;
import br.com.aurora.shared.domain.CreditCardRefundCredit;
import br.com.aurora.shared.domain.CreditCardRefundCreditRepository;
import br.com.aurora.shared.domain.CreditCardRefundRepository;
import br.com.aurora.shared.domain.CreditCardRepository;
import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.ExpenseStatus;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.CreditCardAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegisterCreditCardRefundService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final CreditCardAccess access;
    private final ExpenseRepository expenseRepository;
    private final CreditCardRepository cardRepository;
    private final CreditCardInstallmentRepository installmentRepository;
    private final CreditCardRefundRepository refundRepository;
    private final CreditCardRefundAllocationRepository allocationRepository;
    private final CreditCardRefundCreditRepository refundCreditRepository;
    private final CreditCardLedger ledger;

    @Transactional
    public RegisterCreditCardRefundResponse register(
            UUID expenseId,
            RegisterCreditCardRefundRequest request
    ) {
        var principal = access.requirePrincipal();
        Expense expense = expenseRepository.findForUpdate(
                        expenseId,
                        principal.getFamilyGroup().getId(),
                        ExpenseStatus.ATIVO
                )
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada no grupo familiar."));
        if (expense.getPaymentMethod() != ExpensePaymentMethod.CARTAO_CREDITO) {
            throw new ValidationException("O estorno deve estar vinculado a uma compra no cartão de crédito.");
        }
        BigDecimal amount = request.getAmount();
        BigDecimal alreadyRefunded = refundRepository.sumAmountByExpenseId(expenseId);
        if (amount == null || amount.signum() <= 0 || amount.add(alreadyRefunded).compareTo(expense.getAmount()) > 0) {
            throw new ValidationException("O valor acumulado dos estornos não pode ultrapassar o valor da compra.");
        }
        List<CreditCardInstallment> installments = installmentRepository.findByExpenseIdOrderByInstallmentNumber(
                expenseId
        ).stream().filter(installment -> !installment.isCancelled()).toList();
        if (installments.isEmpty()) {
            throw new ResourceNotFoundException("Parcelas da compra não encontradas.");
        }
        CreditCard card = cardRepository.findForUpdateById(installments.getFirst().getInvoice().getCard().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Cartão da compra não encontrado."));

        CreditCardRefund refund = refundRepository.save(CreditCardRefund.builder()
                .expense(expense)
                .card(card)
                .user(principal)
                .amount(amount)
                .build());
        BigDecimal remaining = amount;
        BigDecimal futureAmount = ZERO;
        List<CreditCardInstallment> futureInstallments = ledger.findUnbilledInstallmentsForRefund(expenseId);
        for (CreditCardInstallment installment : futureInstallments) {
            if (remaining.signum() <= 0) {
                break;
            }
            BigDecimal available = installment.getOutstandingAmount();
            if (available.signum() <= 0) {
                continue;
            }
            BigDecimal reduction = available.min(remaining);
            installment.setRefundedAmount(installment.getRefundedAmount().add(reduction));
            installmentRepository.save(installment);
            allocationRepository.save(CreditCardRefundAllocation.builder()
                    .refund(refund)
                    .installment(installment)
                    .amount(reduction)
                    .build());
            CreditCardInvoice invoice = installment.getInvoice();
            invoice.setTotalAmount(invoice.getTotalAmount().subtract(reduction));
            ledger.refreshInvoice(invoice);
            futureAmount = futureAmount.add(reduction);
            remaining = remaining.subtract(reduction);
        }

        BigDecimal appliedToInvoices = ZERO;
        BigDecimal pending = ZERO;
        if (remaining.signum() > 0) {
            CreditCardRefundCredit credit = refundCreditRepository.save(CreditCardRefundCredit.builder()
                    .refund(refund)
                    .card(card)
                    .amount(remaining)
                    .remainingAmount(remaining)
                    .build());
            appliedToInvoices = ledger.applyCreditToNextOpenInvoice(credit);
            pending = credit.getRemainingAmount();
        }
        return new RegisterCreditCardRefundResponse(
                refund.getId(), expenseId, amount, futureAmount, appliedToInvoices, pending, refund.getCreatedAt()
        );
    }
}
