package br.com.aurora.features.receivables.updateoverduereceivables;

import br.com.aurora.shared.domain.ReceivableHistory;
import br.com.aurora.shared.domain.ReceivableHistoryRepository;
import br.com.aurora.shared.domain.ReceivableRepository;
import br.com.aurora.shared.domain.ReceivableStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class UpdateOverdueReceivablesService {

    private final ReceivableRepository receivableRepository;
    private final ReceivableHistoryRepository historyRepository;

    @Transactional
    public int markOverdue(LocalDate today) {
        var receivables = receivableRepository.findForOverdueRefresh(ReceivableStatus.PENDENTE, today);
        for (var receivable : receivables) {
            receivable.setStatus(ReceivableStatus.ATRASADA);
            historyRepository.save(ReceivableHistory.builder()
                    .receivable(receivable)
                    .previousStatus(ReceivableStatus.PENDENTE)
                    .status(ReceivableStatus.ATRASADA)
                    .description(receivable.getDescription())
                    .expectedAmount(receivable.getExpectedAmount())
                    .expectedDate(receivable.getExpectedDate())
                    .build());
        }
        return receivables.size();
    }
}
