package br.com.aurora.features.receivables.createreceivable;

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
import br.com.aurora.shared.error.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CreateReceivableService {

    private final ReceivableAccess access;
    private final ReceivableSeriesRepository seriesRepository;
    private final ReceivableRepository receivableRepository;
    private final ReceivableHistoryRepository historyRepository;

    @Transactional
    public CreateReceivableResponse create(CreateReceivableRequest request) {
        var principal = access.requirePrincipal();
        if (request == null || request.getDescription() == null || request.getDescription().isBlank()
                || request.getDescription().length() > 255 || request.getExpectedAmount() == null
                || request.getExpectedAmount().signum() <= 0 || request.getExpectedAmount().scale() > 2
                || request.getExpectedAmount().precision() - request.getExpectedAmount().scale() > 10
                || request.getExpectedDate() == null || request.getRecurrence() == null) {
            throw new ValidationException("Informe descrição, valor positivo, data prevista e recorrência válidos.");
        }

        ReceivableSeries series = seriesRepository.save(ReceivableSeries.builder()
                .familyGroup(principal.getFamilyGroup())
                .createdBy(principal)
                .description(request.getDescription().trim())
                .expectedAmount(request.getExpectedAmount())
                .recurrence(request.getRecurrence())
                .nextExpectedDate(request.getRecurrence() == ReceivableRecurrence.MENSAL
                        ? ReceivableDates.nextMonthlyDate(
                                request.getExpectedDate(), request.getExpectedDate().getDayOfMonth())
                        : request.getExpectedDate())
                .nextOccurrenceNumber(2)
                .recurrenceDay(request.getExpectedDate().getDayOfMonth())
                .active(request.getRecurrence() == ReceivableRecurrence.MENSAL)
                .build());
        Receivable receivable = receivableRepository.save(Receivable.builder()
                .familyGroup(principal.getFamilyGroup())
                .series(series)
                .createdBy(principal)
                .occurrenceNumber(1)
                .description(request.getDescription().trim())
                .expectedAmount(request.getExpectedAmount())
                .expectedDate(request.getExpectedDate())
                .recurrence(request.getRecurrence())
                .status(ReceivableStatus.PENDENTE)
                .build());
        historyRepository.save(snapshot(receivable, principal));
        return response(receivable);
    }

    private ReceivableHistory snapshot(Receivable receivable, User changedBy) {
        return ReceivableHistory.builder()
                .receivable(receivable)
                .changedBy(changedBy)
                .status(receivable.getStatus())
                .description(receivable.getDescription())
                .expectedAmount(receivable.getExpectedAmount())
                .expectedDate(receivable.getExpectedDate())
                .build();
    }

    private CreateReceivableResponse response(Receivable receivable) {
        return new CreateReceivableResponse(
                receivable.getId(), receivable.getSeries().getId(), receivable.getOccurrenceNumber(),
                receivable.getDescription(), receivable.getExpectedAmount(), receivable.getExpectedDate(),
                receivable.getRecurrence(), receivable.getStatus()
        );
    }
}
