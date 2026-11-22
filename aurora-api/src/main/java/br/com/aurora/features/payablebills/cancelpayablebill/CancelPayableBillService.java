package br.com.aurora.features.payablebills.cancelpayablebill;

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
public class CancelPayableBillService {

    private final PayableBillAccess access;
    private final PayableBillRepository billRepository;
    private final PayableBillSeriesRepository seriesRepository;
    private final PayableBillPaymentRepository paymentRepository;
    private final PayableBillStatusHistoryRepository historyRepository;

    @Transactional
    public CancelPayableBillResponse cancel(UUID billId, CancelPayableBillRequest request) {
        var principal = access.requirePrincipal();
        if (request == null || request.getScope() == null) {
            throw new ValidationException("O alcance do cancelamento é obrigatório.");
        }
        PayableBill billReference = billRepository.findByIdAndFamilyGroupId(
                        billId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conta a pagar não encontrada."));
        PayableBillSeries series = seriesRepository.findForUpdate(
                        billReference.getSeries().getId(), principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recorrência da conta não encontrada."));
        PayableBill bill = billRepository.findForUpdate(billId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conta a pagar não encontrada."));
        if (bill.getStatus() == PayableBillStatus.PAGA || paymentRepository.findByBillId(bill.getId()).isPresent()) {
            throw new ValidationException("Contas pagas não podem ser canceladas.");
        }
        if (bill.getStatus() == PayableBillStatus.CANCELADA) {
            throw new ValidationException("A conta já está cancelada.");
        }

        int cancelled = 1;
        cancelOccurrence(bill, principal);
        if (request.getScope() == CancelPayableBillScope.OCORRENCIA_E_FUTURAS) {
            series.setActive(false);
            List<PayableBill> futureBills = billRepository
                    .findBySeriesIdAndOccurrenceNumberGreaterThanAndStatusInOrderByOccurrenceNumber(
                            series.getId(),
                            bill.getOccurrenceNumber(),
                            List.of(PayableBillStatus.PENDENTE, PayableBillStatus.ATRASADA)
                    );
            for (PayableBill future : futureBills) {
                if (paymentRepository.findByBillId(future.getId()).isEmpty()) {
                    cancelOccurrence(future, principal);
                    cancelled++;
                }
            }
        } else if (series.isActive() && series.getRecurrence() == PayableBillRecurrence.MENSAL) {
            ensureNextOccurrence(series, bill, principal);
        }
        return new CancelPayableBillResponse(bill.getId(), bill.getStatus(), cancelled);
    }

    private void cancelOccurrence(PayableBill bill, br.com.aurora.shared.domain.User principal) {
        bill.setStatus(PayableBillStatus.CANCELADA);
        bill.setCancelledBy(principal);
        bill.setCancelledAt(java.time.LocalDateTime.now());
        bill.setUpdatedBy(principal);
        historyRepository.save(PayableBillStatusHistory.builder()
                .bill(bill)
                .changedBy(principal)
                .status(PayableBillStatus.CANCELADA)
                .build());
    }

    private void ensureNextOccurrence(
            PayableBillSeries series,
            PayableBill current,
            br.com.aurora.shared.domain.User principal
    ) {
        if (billRepository.findBySeriesIdAndOccurrenceNumber(
                series.getId(), series.getNextOccurrenceNumber()).isPresent()) {
            return;
        }
        LocalDate dueDate = series.getNextDueDate();
        PayableBillStatus status = dueDate.isBefore(LocalDate.now())
                ? PayableBillStatus.ATRASADA
                : PayableBillStatus.PENDENTE;
        PayableBill next = billRepository.save(PayableBill.builder()
                .familyGroup(series.getFamilyGroup())
                .series(series)
                .createdBy(principal)
                .occurrenceNumber(series.getNextOccurrenceNumber())
                .description(series.getDescription())
                .amount(series.getAmount())
                .dueDate(dueDate)
                .category(series.getCategory())
                .recurrence(series.getRecurrence())
                .status(status)
                .build());
        historyRepository.save(PayableBillStatusHistory.builder()
                .bill(next)
                .changedBy(principal)
                .status(status)
                .build());
        series.setNextOccurrenceNumber(series.getNextOccurrenceNumber() + 1);
        series.setNextDueDate(PayableBillDates.nextMonthlyDate(dueDate, series.getRecurrenceDay()));
    }
}
