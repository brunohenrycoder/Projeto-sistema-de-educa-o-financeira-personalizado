package br.com.aurora.features.payablebills.updateoverduepayablebills;

import br.com.aurora.shared.domain.PayableBillRepository;
import br.com.aurora.shared.domain.PayableBillStatus;
import br.com.aurora.shared.domain.PayableBillStatusHistory;
import br.com.aurora.shared.domain.PayableBillStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class UpdateOverduePayableBillsService {

    private final PayableBillRepository billRepository;
    private final PayableBillStatusHistoryRepository historyRepository;

    @Transactional
    public int markOverdue(LocalDate today) {
        var overdueBills = billRepository.findForOverdueRefresh(PayableBillStatus.PENDENTE, today);
        for (var bill : overdueBills) {
            bill.setStatus(PayableBillStatus.ATRASADA);
            historyRepository.save(PayableBillStatusHistory.builder()
                    .bill(bill)
                    .status(PayableBillStatus.ATRASADA)
                    .build());
        }
        return overdueBills.size();
    }
}
