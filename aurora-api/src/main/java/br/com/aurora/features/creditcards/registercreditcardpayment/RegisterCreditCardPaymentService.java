package br.com.aurora.features.creditcards.registercreditcardpayment;

import br.com.aurora.shared.domain.CreditCardInstallment;
import br.com.aurora.shared.domain.CreditCardInstallmentRepository;
import br.com.aurora.shared.domain.CreditCardInvoice;
import br.com.aurora.shared.domain.CreditCardInvoiceRepository;
import br.com.aurora.shared.domain.CreditCardLedger;
import br.com.aurora.shared.domain.CreditCardPayment;
import br.com.aurora.shared.domain.CreditCardPaymentAllocation;
import br.com.aurora.shared.domain.CreditCardPaymentAllocationRepository;
import br.com.aurora.shared.domain.CreditCardPaymentRepository;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import br.com.aurora.shared.security.CreditCardAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegisterCreditCardPaymentService {

    private final CreditCardAccess access;
    private final CreditCardInvoiceRepository invoiceRepository;
    private final CreditCardInstallmentRepository installmentRepository;
    private final CreditCardPaymentRepository paymentRepository;
    private final CreditCardPaymentAllocationRepository allocationRepository;
    private final CreditCardLedger ledger;

    @Transactional
    public RegisterCreditCardPaymentResponse register(
            UUID invoiceId,
            RegisterCreditCardPaymentRequest request
    ) {
        var principal = access.requirePrincipal();
        CreditCardInvoice invoice = invoiceRepository.findLockedByIdAndFamilyGroupId(
                        invoiceId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Fatura não encontrada no grupo familiar."));
        ledger.refreshInvoice(invoice);
        BigDecimal amount = request.getAmount();
        if (amount == null || amount.signum() <= 0) {
            throw new ValidationException("O valor do pagamento deve ser maior que zero.");
        }
        if (amount.compareTo(invoice.getOutstandingAmount()) > 0) {
            throw new ValidationException("O pagamento não pode ultrapassar o saldo pendente da fatura.");
        }

        CreditCardPayment payment = paymentRepository.save(CreditCardPayment.builder()
                .invoice(invoice)
                .user(principal)
                .amount(amount)
                .build());
        BigDecimal remaining = amount;
        for (CreditCardInstallment installment : installmentRepository
                .findByInvoiceIdOrderByExpenseExpenseDateAscInstallmentNumberAsc(invoiceId)) {
            BigDecimal due = installment.getOutstandingAmount();
            if (due.signum() <= 0 || remaining.signum() <= 0) {
                continue;
            }
            BigDecimal allocation = due.min(remaining);
            installment.setPaidAmount(installment.getPaidAmount().add(allocation));
            installmentRepository.save(installment);
            allocationRepository.save(CreditCardPaymentAllocation.builder()
                    .payment(payment)
                    .installment(installment)
                    .amount(allocation)
                    .build());
            remaining = remaining.subtract(allocation);
        }
        if (remaining.signum() > 0) {
            throw new IllegalStateException("O pagamento não pôde ser alocado integralmente às parcelas da fatura.");
        }
        invoice.setPaidAmount(invoice.getPaidAmount().add(amount));
        ledger.refreshInvoice(invoice);
        invoiceRepository.save(invoice);
        return new RegisterCreditCardPaymentResponse(
                payment.getId(), invoiceId, payment.getAmount(), payment.getPaidAt(),
                invoice.getPaidAmount(), invoice.getOutstandingAmount(), invoice.getStatus()
        );
    }
}
