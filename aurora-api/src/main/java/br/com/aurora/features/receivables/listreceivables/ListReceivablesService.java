package br.com.aurora.features.receivables.listreceivables;

import br.com.aurora.features.receivables.ReceivableAccess;
import br.com.aurora.shared.domain.ReceivableConfirmationRepository;
import br.com.aurora.shared.domain.ReceivableRepository;
import br.com.aurora.shared.domain.ReceivableStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ListReceivablesService {

    private final ReceivableAccess access;
    private final ReceivableRepository receivableRepository;
    private final ReceivableConfirmationRepository confirmationRepository;

    @Transactional(readOnly = true)
    public ListReceivablesResponse list() {
        var principal = access.requirePrincipal();
        LocalDate today = LocalDate.now();
        var records = receivableRepository.findByFamilyGroupIdOrderByExpectedDateAsc(
                principal.getFamilyGroup().getId());
        var confirmationsByReceivableId = records.isEmpty()
                ? Map.<UUID, br.com.aurora.shared.domain.ReceivableConfirmation>of()
                : confirmationRepository.findByReceivableIdIn(
                                records.stream().map(receivable -> receivable.getId()).toList())
                        .stream()
                        .collect(Collectors.toMap(
                                confirmation -> confirmation.getReceivable().getId(),
                                confirmation -> confirmation
                        ));
        var receivables = records
                .stream()
                .map(receivable -> {
                    var confirmation = confirmationsByReceivableId.get(receivable.getId());
                    LocalDate receivedDate = confirmation == null ? null : confirmation.getReceivedDate();
                    ReceivableStatus status = receivable.getStatus() == ReceivableStatus.PENDENTE
                            && receivable.getExpectedDate().isBefore(today)
                            ? ReceivableStatus.ATRASADA
                            : receivable.getStatus();
                    return new ListReceivablesResponse.ReceivableItem(
                            receivable.getId(),
                            receivable.getSeries().getId(),
                            receivable.getOccurrenceNumber(),
                            receivable.getDescription(),
                            receivable.getExpectedAmount(),
                            receivable.getExpectedDate(),
                            receivedDate,
                            receivable.getRecurrence(),
                            status
                    );
                })
                .toList();
        return new ListReceivablesResponse(receivables);
    }
}
