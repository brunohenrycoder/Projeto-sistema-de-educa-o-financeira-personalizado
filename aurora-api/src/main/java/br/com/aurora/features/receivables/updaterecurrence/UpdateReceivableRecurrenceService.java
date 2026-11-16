package br.com.aurora.features.receivables.updaterecurrence;

import br.com.aurora.features.receivables.ReceivableAccess;
import br.com.aurora.shared.domain.Receivable;
import br.com.aurora.shared.domain.ReceivableDates;
import br.com.aurora.shared.domain.ReceivableHistory;
import br.com.aurora.shared.domain.ReceivableHistoryRepository;
import br.com.aurora.shared.domain.ReceivableRecurrence;
import br.com.aurora.shared.domain.ReceivableRepository;
import br.com.aurora.shared.domain.ReceivableSeries;
import br.com.aurora.shared.domain.ReceivableSeriesRepository;
import br.com.aurora.shared.domain.ReceivableStatus;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UpdateReceivableRecurrenceService {

    private final ReceivableAccess access;
    private final ReceivableRepository receivableRepository;
    private final ReceivableSeriesRepository seriesRepository;
    private final ReceivableHistoryRepository historyRepository;

    @Transactional
    public UpdateReceivableRecurrenceResponse update(
            UUID receivableId,
            UpdateReceivableRecurrenceRequest request
    ) {
        var principal = access.requirePrincipal();
        validateRequest(request);
        Receivable reference = receivableRepository.findByIdAndFamilyGroupId(
                        receivableId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recebimento não encontrado."));
        ReceivableSeries series = seriesRepository.findForUpdate(
                        reference.getSeries().getId(), principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recorrência do recebimento não encontrada."));
        Receivable receivable = receivableRepository.findForUpdate(
                        receivableId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recebimento não encontrado."));
        if (receivable.getStatus() == ReceivableStatus.CANCELADA || !series.isActive()
                || series.getRecurrence() != ReceivableRecurrence.MENSAL) {
            throw new ValidationException("A configuração só pode ser alterada em uma recorrência mensal ativa.");
        }

        series.setDescription(request.getDescription().trim());
        series.setExpectedAmount(request.getExpectedAmount());
        series.setRecurrenceDay(request.getRecurrenceDay());
        LocalDate nextExpectedDate = request.getNextExpectedDate();
        List<Receivable> futureReceivables = receivableRepository
                .findForUpdateBySeriesAndOccurrenceNumber(
                        series.getId(),
                        receivable.getOccurrenceNumber() + 1,
                        List.of(ReceivableStatus.PENDENTE, ReceivableStatus.ATRASADA)
                );
        int updated = 0;
        for (Receivable future : futureReceivables) {
            String previousDescription = future.getDescription();
            var previousAmount = future.getExpectedAmount();
            LocalDate previousDate = future.getExpectedDate();
            ReceivableStatus previousStatus = future.getStatus();
            future.setDescription(series.getDescription());
            future.setExpectedAmount(series.getExpectedAmount());
            future.setExpectedDate(nextExpectedDate);
            future.setStatus(ReceivableStatus.forExpectedDate(previousStatus, nextExpectedDate, LocalDate.now()));
            future.setUpdatedBy(principal);
            historyRepository.save(snapshot(
                    future, principal, previousStatus, previousDescription, previousAmount, previousDate));
            nextExpectedDate = ReceivableDates.nextMonthlyDate(nextExpectedDate, series.getRecurrenceDay());
            updated++;
        }
        series.setNextExpectedDate(nextExpectedDate);
        return new UpdateReceivableRecurrenceResponse(
                series.getId(), series.getRecurrence(), series.getNextExpectedDate(), updated
        );
    }

    private void validateRequest(UpdateReceivableRecurrenceRequest request) {
        if (request == null || request.getDescription() == null || request.getDescription().isBlank()
                || request.getDescription().length() > 255 || request.getExpectedAmount() == null
                || request.getExpectedAmount().signum() <= 0 || request.getExpectedAmount().scale() > 2
                || request.getExpectedAmount().precision() - request.getExpectedAmount().scale() > 10
                || request.getNextExpectedDate() == null || request.getRecurrenceDay() == null
                || request.getRecurrenceDay() < 1 || request.getRecurrenceDay() > 31
                || request.getNextExpectedDate().getDayOfMonth() != Math.min(
                        request.getRecurrenceDay(), YearMonth.from(request.getNextExpectedDate()).lengthOfMonth())) {
            throw new ValidationException("Informe descrição, valor positivo e próxima data válidos.");
        }
    }

    private ReceivableHistory snapshot(
            Receivable receivable,
            User changedBy,
            ReceivableStatus previousStatus,
            String previousDescription,
            BigDecimal previousAmount,
            LocalDate previousDate
    ) {
        return ReceivableHistory.builder()
                .receivable(receivable)
                .changedBy(changedBy)
                .previousStatus(previousStatus)
                .status(receivable.getStatus())
                .previousDescription(previousDescription)
                .description(receivable.getDescription())
                .previousExpectedAmount(previousAmount)
                .expectedAmount(receivable.getExpectedAmount())
                .previousExpectedDate(previousDate)
                .expectedDate(receivable.getExpectedDate())
                .build();
    }
}
