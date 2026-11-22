package br.com.aurora.features.payablebills.createpayablebill;

import br.com.aurora.features.payablebills.PayableBillAccess;
import br.com.aurora.shared.domain.PayableBill;
import br.com.aurora.shared.domain.PayableBillDates;
import br.com.aurora.shared.domain.PayableBillRecurrence;
import br.com.aurora.shared.domain.PayableBillSeries;
import br.com.aurora.shared.domain.PayableBillSeriesRepository;
import br.com.aurora.shared.domain.PayableBillRepository;
import br.com.aurora.shared.domain.PayableBillStatus;
import br.com.aurora.shared.domain.PayableBillStatusHistory;
import br.com.aurora.shared.domain.PayableBillStatusHistoryRepository;
import br.com.aurora.shared.error.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class CreatePayableBillService {

    private final PayableBillAccess access;
    private final PayableBillSeriesRepository seriesRepository;
    private final PayableBillRepository billRepository;
    private final PayableBillStatusHistoryRepository historyRepository;

    @Transactional
    public CreatePayableBillResponse create(CreatePayableBillRequest request) {
        var principal = access.requirePrincipal();
        if (request == null || request.getDescription() == null || request.getDescription().isBlank()
                || request.getDescription().length() > 255) {
            throw new ValidationException("Informe uma descrição com até 255 caracteres.");
        }
        if (request.getAmount() == null || request.getAmount().signum() <= 0
                || request.getAmount().scale() > 2 || request.getAmount().precision() - request.getAmount().scale() > 10) {
            throw new ValidationException("O valor deve ser positivo e ter no máximo duas casas decimais.");
        }
        if (request.getDueDate() == null || request.getCategory() == null || request.getRecurrence() == null) {
            throw new ValidationException("Vencimento, categoria e recorrência são obrigatórios.");
        }
        PayableBillSeries series = seriesRepository.save(PayableBillSeries.builder()
                .familyGroup(principal.getFamilyGroup())
                .createdBy(principal)
                .description(request.getDescription().trim())
                .amount(request.getAmount())
                .category(request.getCategory())
                .recurrence(request.getRecurrence())
                .nextDueDate(request.getDueDate())
                .nextOccurrenceNumber(2)
                .recurrenceDay(request.getDueDate().getDayOfMonth())
                .active(request.getRecurrence() == PayableBillRecurrence.MENSAL)
                .build());
        PayableBillStatus status = request.getDueDate().isBefore(LocalDate.now())
                ? PayableBillStatus.ATRASADA
                : PayableBillStatus.PENDENTE;
        PayableBill bill = billRepository.save(PayableBill.builder()
                .familyGroup(principal.getFamilyGroup())
                .series(series)
                .createdBy(principal)
                .occurrenceNumber(1)
                .description(request.getDescription().trim())
                .amount(request.getAmount())
                .dueDate(request.getDueDate())
                .category(request.getCategory())
                .recurrence(request.getRecurrence())
                .status(status)
                .build());
        recordStatus(bill, principal, status);
        series.setNextDueDate(PayableBillDates.nextMonthlyDate(
                request.getDueDate(), series.getRecurrenceDay()));
        return new CreatePayableBillResponse(
                bill.getId(), series.getId(), bill.getOccurrenceNumber(), bill.getDescription(),
                bill.getAmount(), bill.getDueDate(), bill.getCategory(), bill.getRecurrence(), bill.getStatus()
        );
    }

    private void recordStatus(PayableBill bill, br.com.aurora.shared.domain.User changedBy, PayableBillStatus status) {
        historyRepository.save(PayableBillStatusHistory.builder()
                .bill(bill)
                .changedBy(changedBy)
                .status(status)
                .build());
    }
}
