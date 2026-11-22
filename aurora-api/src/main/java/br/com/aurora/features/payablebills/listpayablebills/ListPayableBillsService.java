package br.com.aurora.features.payablebills.listpayablebills;

import br.com.aurora.features.payablebills.PayableBillAccess;
import br.com.aurora.shared.domain.PayableBillRepository;
import br.com.aurora.shared.domain.PayableBillStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ListPayableBillsService {

    private final PayableBillAccess access;
    private final PayableBillRepository billRepository;

    @Transactional(readOnly = true)
    public ListPayableBillsResponse list() {
        var principal = access.requirePrincipal();
        LocalDate today = LocalDate.now();
        var bills = billRepository.findByFamilyGroupIdOrderByDueDateAsc(principal.getFamilyGroup().getId())
                .stream()
                .map(bill -> new ListPayableBillsResponse.PayableBillItem(
                        bill.getId(), bill.getSeries().getId(), bill.getOccurrenceNumber(), bill.getDescription(),
                        bill.getAmount(), bill.getDueDate(), bill.getCategory(), bill.getRecurrence(),
                        bill.getStatus() == PayableBillStatus.PENDENTE
                                && bill.getDueDate().isBefore(today)
                                ? PayableBillStatus.ATRASADA
                                : bill.getStatus()
                ))
                .toList();
        return new ListPayableBillsResponse(bills);
    }
}
