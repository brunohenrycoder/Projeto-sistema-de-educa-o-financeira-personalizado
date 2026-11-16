package br.com.aurora.features.receivables.confirmreceivable;

import br.com.aurora.features.receivables.ReceivableAccess;
import br.com.aurora.shared.domain.Receivable;
import br.com.aurora.shared.domain.ReceivableConfirmation;
import br.com.aurora.shared.domain.ReceivableConfirmationRepository;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConfirmReceivableService {

    private final ReceivableAccess access;
    private final ReceivableRepository receivableRepository;
    private final ReceivableSeriesRepository seriesRepository;
    private final ReceivableConfirmationRepository confirmationRepository;
    private final ReceivableHistoryRepository historyRepository;

    @Transactional
    public ConfirmReceivableResponse confirm(UUID receivableId, ConfirmReceivableRequest request) {
        var principal = access.requirePrincipal();
        if (request == null || request.getReceivedDate() == null) {
            throw new ValidationException("A data efetiva do recebimento é obrigatória.");
        }
        if (request.getAmount() != null
                && (request.getAmount().signum() <= 0 || request.getAmount().scale() > 2
                || request.getAmount().precision() - request.getAmount().scale() > 10)) {
            throw new ValidationException("O valor recebido deve ser positivo e ter no máximo duas casas decimais.");
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
        if (receivable.getStatus() != ReceivableStatus.PENDENTE
                && receivable.getStatus() != ReceivableStatus.ATRASADA) {
            throw new ValidationException("Somente recebimentos pendentes ou atrasados podem ser confirmados.");
        }
        if (confirmationRepository.findByReceivableId(receivable.getId()).isPresent()) {
            throw new ValidationException("Este recebimento já foi confirmado.");
        }

        BigDecimal amount = request.getAmount() == null ? receivable.getExpectedAmount() : request.getAmount();
        if (amount.compareTo(receivable.getExpectedAmount()) != 0) {
            throw new ValidationException("O valor recebido deve ser igual ao valor esperado.");
        }
        ReceivableStatus previousStatus = receivable.getStatus();
        ReceivableConfirmation confirmation = confirmationRepository.save(ReceivableConfirmation.builder()
                .receivable(receivable)
                .receivedBy(principal)
                .amount(amount)
                .receivedDate(request.getReceivedDate())
                .build());
        receivable.setStatus(ReceivableStatus.RECEBIDA);
        receivable.setUpdatedBy(principal);
        historyRepository.save(snapshot(receivable, principal, previousStatus));

        UUID nextOccurrenceId = null;
        if (series.isActive() && series.getRecurrence() == ReceivableRecurrence.MENSAL) {
            nextOccurrenceId = createNextOccurrence(series, principal);
        }
        return new ConfirmReceivableResponse(
                confirmation.getId(),
                receivable.getId(),
                confirmation.getAmount(),
                receivable.getExpectedDate(),
                confirmation.getReceivedDate(),
                receivable.getStatus(),
                nextOccurrenceId
        );
    }

    private UUID createNextOccurrence(ReceivableSeries series, User principal) {
        int occurrenceNumber = series.getNextOccurrenceNumber();
        var existing = receivableRepository.findBySeriesIdAndOccurrenceNumber(series.getId(), occurrenceNumber);
        if (existing.isPresent()) {
            return existing.get().getId();
        }
        LocalDate expectedDate = series.getNextExpectedDate();
        Receivable next = receivableRepository.save(Receivable.builder()
                .familyGroup(series.getFamilyGroup())
                .series(series)
                .createdBy(principal)
                .occurrenceNumber(occurrenceNumber)
                .description(series.getDescription())
                .expectedAmount(series.getExpectedAmount())
                .expectedDate(expectedDate)
                .recurrence(series.getRecurrence())
                .status(ReceivableStatus.PENDENTE)
                .build());
        historyRepository.save(snapshot(next, principal, null));
        series.setNextOccurrenceNumber(occurrenceNumber + 1);
        series.setNextExpectedDate(ReceivableDates.nextMonthlyDate(expectedDate, series.getRecurrenceDay()));
        return next.getId();
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
