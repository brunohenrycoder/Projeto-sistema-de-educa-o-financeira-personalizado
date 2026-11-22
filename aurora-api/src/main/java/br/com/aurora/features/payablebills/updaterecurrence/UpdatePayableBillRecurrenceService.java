package br.com.aurora.features.payablebills.updaterecurrence;

import br.com.aurora.features.payablebills.PayableBillAccess;
import br.com.aurora.shared.domain.PayableBill;
import br.com.aurora.shared.domain.PayableBillDates;
import br.com.aurora.shared.domain.PayableBillPaymentRepository;
import br.com.aurora.shared.domain.PayableBillRecurrence;
import br.com.aurora.shared.domain.PayableBillRepository;
import br.com.aurora.shared.domain.PayableBillSeries;
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
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UpdatePayableBillRecurrenceService {

    private final PayableBillAccess access;
    private final PayableBillRepository billRepository;
    private final PayableBillSeriesRepository seriesRepository;
    private final PayableBillPaymentRepository paymentRepository;
    private final PayableBillStatusHistoryRepository historyRepository;

    @Transactional
    public UpdatePayableBillRecurrenceResponse update(
            UUID billId,
            UpdatePayableBillRecurrenceRequest request
    ) {
        var principal = access.requirePrincipal();
        if (request == null || request.getDescription() == null || request.getDescription().isBlank()
                || request.getDescription().length() > 255
                || request.getAmount() == null || request.getAmount().signum() <= 0
                || request.getAmount().scale() > 2 || request.getAmount().precision() - request.getAmount().scale() > 10
                || request.getCategory() == null || request.getNextDueDate() == null) {
            throw new ValidationException("Informe descrição, valor, categoria e próximo vencimento válidos.");
        }
        PayableBill billReference = billRepository.findByIdAndFamilyGroupId(
                        billId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conta a pagar não encontrada."));
        PayableBillSeries series = seriesRepository.findForUpdate(
                        billReference.getSeries().getId(), principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recorrência da conta não encontrada."));
        PayableBill bill = billRepository.findForUpdate(billId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conta a pagar não encontrada."));
        if (bill.getStatus() == PayableBillStatus.CANCELADA
                || !series.isActive() || series.getRecurrence() != PayableBillRecurrence.MENSAL) {
            throw new ValidationException("A configuração só pode ser alterada em uma recorrência mensal ativa.");
        }

        series.setDescription(request.getDescription().trim());
        series.setAmount(request.getAmount());
        series.setCategory(request.getCategory());
        LocalDate nextDueDate = request.getNextDueDate();
        series.setRecurrenceDay(nextDueDate.getDayOfMonth());
        List<PayableBill> futureBills = billRepository
                .findBySeriesIdAndOccurrenceNumberGreaterThanAndStatusInOrderByOccurrenceNumber(
                        series.getId(),
                        bill.getOccurrenceNumber(),
                        List.of(PayableBillStatus.PENDENTE, PayableBillStatus.ATRASADA)
                );
        int updatedOccurrences = 0;
        for (PayableBill future : futureBills) {
            if (paymentRepository.findByBillId(future.getId()).isPresent()) {
                continue;
            }
            future.setDescription(series.getDescription());
            future.setAmount(series.getAmount());
            future.setCategory(series.getCategory());
            future.setDueDate(nextDueDate);
            nextDueDate = PayableBillDates.nextMonthlyDate(nextDueDate, series.getRecurrenceDay());
            updateStatusForDueDate(future, principal);
            updatedOccurrences++;
        }
        series.setNextDueDate(nextDueDate);
        return new UpdatePayableBillRecurrenceResponse(
                series.getId(), series.getRecurrence(), series.getNextDueDate(), updatedOccurrences
        );
    }

    private void updateStatusForDueDate(PayableBill bill, br.com.aurora.shared.domain.User principal) {
        PayableBillStatus status = bill.getDueDate().isBefore(LocalDate.now())
                ? PayableBillStatus.ATRASADA
                : PayableBillStatus.PENDENTE;
        if (bill.getStatus() != status) {
            bill.setStatus(status);
            historyRepository.save(PayableBillStatusHistory.builder()
                    .bill(bill)
                    .changedBy(principal)
                    .status(status)
                    .build());
        }
        bill.setUpdatedBy(principal);
    }
}
