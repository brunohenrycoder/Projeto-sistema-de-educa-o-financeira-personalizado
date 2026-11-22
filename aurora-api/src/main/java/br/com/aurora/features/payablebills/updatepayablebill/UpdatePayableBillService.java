package br.com.aurora.features.payablebills.updatepayablebill;

import br.com.aurora.features.payablebills.PayableBillAccess;
import br.com.aurora.shared.domain.PayableBill;
import br.com.aurora.shared.domain.PayableBillRepository;
import br.com.aurora.shared.domain.PayableBillSeriesRepository;
import br.com.aurora.shared.domain.PayableBillStatus;
import br.com.aurora.shared.domain.PayableBillStatusHistory;
import br.com.aurora.shared.domain.PayableBillStatusHistoryRepository;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class UpdatePayableBillService {

    private final PayableBillAccess access;
    private final PayableBillRepository billRepository;
    private final PayableBillSeriesRepository seriesRepository;
    private final PayableBillStatusHistoryRepository historyRepository;

    @Transactional
    public UpdatePayableBillResponse update(java.util.UUID billId, UpdatePayableBillRequest request) {
        var principal = access.requirePrincipal();
        if (request == null || request.getDescription() == null || request.getDescription().isBlank()
                || request.getDescription().length() > 255
                || request.getAmount() == null || request.getAmount().signum() <= 0
                || request.getAmount().scale() > 2 || request.getAmount().precision() - request.getAmount().scale() > 10
                || request.getDueDate() == null || request.getCategory() == null) {
            throw new ValidationException("Informe descrição, valor positivo, vencimento e categoria válidos.");
        }
        PayableBill billReference = billRepository.findByIdAndFamilyGroupId(
                        billId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conta a pagar não encontrada."));
        seriesRepository.findForUpdate(billReference.getSeries().getId(), principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recorrência da conta não encontrada."));
        PayableBill bill = billRepository.findForUpdate(billId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conta a pagar não encontrada."));
        if (bill.getStatus() == PayableBillStatus.PAGA || bill.getStatus() == PayableBillStatus.CANCELADA) {
            throw new ValidationException("Contas pagas ou canceladas não podem ser alteradas.");
        }
        bill.setDescription(request.getDescription().trim());
        bill.setAmount(request.getAmount());
        bill.setDueDate(request.getDueDate());
        bill.setCategory(request.getCategory());
        bill.setUpdatedBy(principal);
        PayableBillStatus nextStatus = request.getDueDate().isBefore(LocalDate.now())
                ? PayableBillStatus.ATRASADA
                : PayableBillStatus.PENDENTE;
        if (bill.getStatus() != nextStatus) {
            bill.setStatus(nextStatus);
            historyRepository.save(PayableBillStatusHistory.builder()
                    .bill(bill)
                    .changedBy(principal)
                    .status(nextStatus)
                    .build());
        }
        return new UpdatePayableBillResponse(
                bill.getId(), bill.getDescription(), bill.getAmount(), bill.getDueDate(),
                bill.getCategory(), bill.getRecurrence(), bill.getStatus()
        );
    }
}
