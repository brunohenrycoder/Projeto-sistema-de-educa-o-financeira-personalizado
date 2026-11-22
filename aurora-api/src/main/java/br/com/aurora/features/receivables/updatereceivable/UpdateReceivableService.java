package br.com.aurora.features.receivables.updatereceivable;

import br.com.aurora.features.receivables.ReceivableAccess;
import br.com.aurora.shared.domain.Receivable;
import br.com.aurora.shared.domain.ReceivableHistory;
import br.com.aurora.shared.domain.ReceivableHistoryRepository;
import br.com.aurora.shared.domain.ReceivableRepository;
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
public class UpdateReceivableService {

    private final ReceivableAccess access;
    private final ReceivableRepository receivableRepository;
    private final ReceivableSeriesRepository seriesRepository;
    private final ReceivableHistoryRepository historyRepository;

    @Transactional
    public UpdateReceivableResponse update(UUID receivableId, UpdateReceivableRequest request) {
        var principal = access.requirePrincipal();
        validateRequest(request);
        Receivable reference = receivableRepository.findByIdAndFamilyGroupId(
                        receivableId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recebimento não encontrado."));
        seriesRepository.findForUpdate(reference.getSeries().getId(), principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recorrência do recebimento não encontrada."));
        Receivable receivable = receivableRepository.findForUpdate(
                        receivableId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recebimento não encontrado."));
        if (receivable.getStatus() == ReceivableStatus.RECEBIDA
                || receivable.getStatus() == ReceivableStatus.CANCELADA) {
            throw new ValidationException("Recebimentos recebidos ou cancelados não podem ser alterados.");
        }

        ReceivableStatus previousStatus = receivable.getStatus();
        String previousDescription = receivable.getDescription();
        var previousAmount = receivable.getExpectedAmount();
        LocalDate previousDate = receivable.getExpectedDate();
        receivable.setDescription(request.getDescription().trim());
        receivable.setExpectedAmount(request.getExpectedAmount());
        receivable.setExpectedDate(request.getExpectedDate());
        receivable.setStatus(ReceivableStatus.forExpectedDate(
                receivable.getStatus(), request.getExpectedDate(), LocalDate.now()));
        receivable.setUpdatedBy(principal);
        historyRepository.save(snapshot(
                receivable, principal, previousStatus, previousDescription, previousAmount, previousDate));
        return new UpdateReceivableResponse(
                receivable.getId(), receivable.getDescription(), receivable.getExpectedAmount(),
                receivable.getExpectedDate(), receivable.getRecurrence(), receivable.getStatus()
        );
    }

    private void validateRequest(UpdateReceivableRequest request) {
        if (request == null || request.getDescription() == null || request.getDescription().isBlank()
                || request.getDescription().length() > 255 || request.getExpectedAmount() == null
                || request.getExpectedAmount().signum() <= 0 || request.getExpectedAmount().scale() > 2
                || request.getExpectedAmount().precision() - request.getExpectedAmount().scale() > 10
                || request.getExpectedDate() == null) {
            throw new ValidationException("Informe descrição, valor positivo e data prevista válidos.");
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
