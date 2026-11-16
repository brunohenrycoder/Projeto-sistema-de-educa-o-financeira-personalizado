package br.com.aurora.features.payablebills.listpayablebillpayments;

import br.com.aurora.features.payablebills.PayableBillAccess;
import br.com.aurora.shared.domain.PayableBillRepository;
import br.com.aurora.shared.domain.PayableBillPaymentRepository;
import br.com.aurora.shared.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListPayableBillPaymentsService {

    private final PayableBillAccess access;
    private final PayableBillRepository billRepository;
    private final PayableBillPaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public ListPayableBillPaymentsResponse list(UUID billId) {
        var principal = access.requirePrincipal();
        var bill = billRepository.findByIdAndFamilyGroupId(billId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conta a pagar não encontrada."));
        var payments = paymentRepository.findByBillIdOrderByCreatedAtDesc(bill.getId()).stream()
                .map(payment -> new ListPayableBillPaymentsResponse.PaymentItem(
                        payment.getId(), bill.getId(), payment.getExpense().getId(), payment.getAmount(),
                        payment.getPaymentDate(), payment.getPaymentMethod(), payment.getPaidBy().getId(),
                        payment.getPaidBy().getName(), payment.getCreatedAt()
                ))
                .toList();
        return new ListPayableBillPaymentsResponse(payments);
    }
}
