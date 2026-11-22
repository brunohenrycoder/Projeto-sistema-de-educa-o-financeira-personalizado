package br.com.aurora.features.receivables.cancelreceivable;

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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CancelReceivableService {

    private final ReceivableAccess access;
    private final ReceivableRepository receivableRepository;
    private final ReceivableSeriesRepository seriesRepository;
    private final ReceivableHistoryRepository historyRepository;

    @Transactional
    public CancelReceivableResponse cancel(UUID receivableId, CancelReceivableRequest request) {
        var principal = access.requirePrincipal();
        if (request == null || request.getScope() == null) {
            throw new ValidationException("O alcance do cancelamento é obrigatório.");
        }
        Receivable reference = receivableRepository.findByIdAndFamilyGroupId(
                        receivableId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recebimento não encontrado."));
        ReceivableSeries series = seriesRepository.findForUpdate(
                        reference.getSeries().getId(), principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recorrência do recebimento não encontrada."));
        Receivable receivable = receivableRepository.findForUpdate(
                        receivableId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recebimento não encontrado."));
        if (receivable.getStatus() == ReceivableStatus.RECEBIDA) {
            throw new ValidationException("Recebimentos confirmados não podem ser cancelados.");
        }
        if (receivable.getStatus() == ReceivableStatus.CANCELADA) {
            throw new ValidationException("Este recebimento já foi cancelado.");
        }

        List<Receivable> targets = new ArrayList<>();
        targets.add(receivable);
        boolean cancelFuture = request.getScope() == CancellationScope.OCORRENCIA_E_FUTURAS;
        if (cancelFuture) {
            targets.addAll(receivableRepository.findForUpdateBySeriesAndOccurrenceNumber(
                    series.getId(),
                    receivable.getOccurrenceNumber() + 1,
                    List.of(ReceivableStatus.PENDENTE, ReceivableStatus.ATRASADA)
            ));
        }

        List<UUID> cancelledIds = new ArrayList<>();
        for (Receivable target : targets) {
            ReceivableStatus previousStatus = target.getStatus();
            target.setStatus(ReceivableStatus.CANCELADA);
            target.setCancelledBy(principal);
            target.setCancelledAt(LocalDateTime.now());
            historyRepository.save(snapshot(target, principal, previousStatus));
            cancelledIds.add(target.getId());
        }

        if (cancelFuture) {
            series.setActive(false);
        } else if (series.isActive() && series.getRecurrence() == ReceivableRecurrence.MENSAL) {
            createNextOccurrenceIfMissing(series, principal);
        }
        return new CancelReceivableResponse(cancelledIds, series.isActive());
    }

    private void createNextOccurrenceIfMissing(
            ReceivableSeries series,
            User principal
    ) {
        if (receivableRepository.findBySeriesIdAndOccurrenceNumber(
                series.getId(), series.getNextOccurrenceNumber()).isPresent()) {
            return;
        }
        Receivable next = receivableRepository.save(Receivable.builder()
                .familyGroup(series.getFamilyGroup())
                .series(series)
                .createdBy(principal)
                .occurrenceNumber(series.getNextOccurrenceNumber())
                .description(series.getDescription())
                .expectedAmount(series.getExpectedAmount())
                .expectedDate(series.getNextExpectedDate())
                .recurrence(series.getRecurrence())
                .status(ReceivableStatus.PENDENTE)
                .build());
        historyRepository.save(snapshot(next, principal, null));
        series.setNextOccurrenceNumber(series.getNextOccurrenceNumber() + 1);
        series.setNextExpectedDate(ReceivableDates.nextMonthlyDate(
                series.getNextExpectedDate(), series.getRecurrenceDay()));
    }

    private ReceivableHistory snapshot(
            Receivable receivable,
            User changedBy,
            ReceivableStatus previousStatus
    ) {
        return ReceivableHistory.builder()
                .receivable(receivable)
                .changedBy(changedBy)
                .previousStatus(previousStatus)
                .status(receivable.getStatus())
                .description(receivable.getDescription())
                .expectedAmount(receivable.getExpectedAmount())
                .expectedDate(receivable.getExpectedDate())
                .build();
    }
}
