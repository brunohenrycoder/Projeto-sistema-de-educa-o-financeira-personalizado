package br.com.aurora.features.receivables.getreceivablehistory;

import br.com.aurora.features.receivables.ReceivableAccess;
import br.com.aurora.shared.domain.ReceivableConfirmationRepository;
import br.com.aurora.shared.domain.ReceivableHistoryRepository;
import br.com.aurora.shared.domain.ReceivableRepository;
import br.com.aurora.shared.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GetReceivableHistoryService {

    private final ReceivableAccess access;
    private final ReceivableRepository receivableRepository;
    private final ReceivableHistoryRepository historyRepository;
    private final ReceivableConfirmationRepository confirmationRepository;

    @Transactional(readOnly = true)
    public ReceivableHistoryResponse getHistory(UUID receivableId) {
        var principal = access.requirePrincipal();
        var receivable = receivableRepository.findByIdAndFamilyGroupId(
                        receivableId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recebimento não encontrado."));
        var history = historyRepository.findByReceivableIdOrderByChangedAtAsc(receivableId).stream()
                .map(entry -> new ReceivableHistoryResponse.HistoryEntry(
                        entry.getId(),
                        entry.getChangedBy() == null ? null : entry.getChangedBy().getName(),
                        entry.getChangedAt(),
                        entry.getPreviousStatus(),
                        entry.getStatus(),
                        entry.getPreviousDescription(),
                        entry.getDescription(),
                        entry.getPreviousExpectedAmount(),
                        entry.getExpectedAmount(),
                        entry.getPreviousExpectedDate(),
                        entry.getExpectedDate()
                ))
                .toList();
        var confirmation = confirmationRepository.findByReceivableId(receivableId)
                .map(item -> new ReceivableHistoryResponse.Confirmation(
                        item.getAmount(),
                        receivable.getExpectedDate(),
                        item.getReceivedDate(),
                        item.getReceivedBy().getName()
                ))
                .orElse(null);
        return new ReceivableHistoryResponse(receivableId, history, confirmation);
    }
}
