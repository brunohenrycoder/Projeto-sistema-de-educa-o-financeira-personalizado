package br.com.aurora.features.receivables;

import br.com.aurora.features.expenses.ExpenseServiceTestSupport;
import br.com.aurora.features.receivables.cancelreceivable.CancelReceivableRequest;
import br.com.aurora.features.receivables.cancelreceivable.CancelReceivableService;
import br.com.aurora.features.receivables.cancelreceivable.CancellationScope;
import br.com.aurora.features.receivables.confirmreceivable.ConfirmReceivableRequest;
import br.com.aurora.features.receivables.confirmreceivable.ConfirmReceivableService;
import br.com.aurora.features.receivables.createreceivable.CreateReceivableRequest;
import br.com.aurora.features.receivables.createreceivable.CreateReceivableService;
import br.com.aurora.features.receivables.listreceivables.ListReceivablesService;
import br.com.aurora.features.receivables.updateoverduereceivables.UpdateOverdueReceivablesService;
import br.com.aurora.features.receivables.updatereceivable.UpdateReceivableRequest;
import br.com.aurora.features.receivables.updatereceivable.UpdateReceivableService;
import br.com.aurora.features.receivables.updaterecurrence.UpdateReceivableRecurrenceRequest;
import br.com.aurora.features.receivables.updaterecurrence.UpdateReceivableRecurrenceService;
import br.com.aurora.shared.domain.ReceivableConfirmationRepository;
import br.com.aurora.shared.domain.ReceivableHistoryRepository;
import br.com.aurora.shared.domain.ReceivableRecurrence;
import br.com.aurora.shared.domain.ReceivableRepository;
import br.com.aurora.shared.domain.ReceivableSeriesRepository;
import br.com.aurora.shared.domain.ReceivableStatus;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReceivableServiceTest extends ExpenseServiceTestSupport {

    @Autowired private CreateReceivableService createService;
    @Autowired private ListReceivablesService listService;
    @Autowired private ConfirmReceivableService confirmService;
    @Autowired private CancelReceivableService cancelService;
    @Autowired private UpdateReceivableService updateService;
    @Autowired private UpdateReceivableRecurrenceService recurrenceService;
    @Autowired private UpdateOverdueReceivablesService overdueService;
    @Autowired private ReceivableRepository receivableRepository;
    @Autowired private ReceivableSeriesRepository seriesRepository;
    @Autowired private ReceivableConfirmationRepository confirmationRepository;
    @Autowired private ReceivableHistoryRepository historyRepository;
    @Autowired private MockMvc mockMvc;

    @Test
    void confirmsFullReceiptOnceAndCreatesNextMonthlyOccurrence() {
        User principal = createUser(Role.PRINCIPAL, "receivable-monthly-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var receivable = create(ReceivableRecurrence.MENSAL, LocalDate.of(2027, 1, 31));

        assertThat(receivable.status()).isEqualTo(ReceivableStatus.PENDENTE);
        var confirmation = confirmService.confirm(receivable.id(), ConfirmReceivableRequest.builder()
                .receivedDate(LocalDate.of(2027, 2, 2))
                .build());

        assertThat(confirmation.status()).isEqualTo(ReceivableStatus.RECEBIDA);
        assertThat(confirmation.amount()).isEqualByComparingTo("100.00");
        assertThat(confirmation.nextOccurrenceId()).isNotNull();
        assertThat(confirmationRepository.findByReceivableId(receivable.id())).isPresent();
        assertThat(receivableRepository.findById(confirmation.nextOccurrenceId()).orElseThrow())
                .satisfies(next -> {
                    assertThat(next.getExpectedDate()).isEqualTo(LocalDate.of(2027, 2, 28));
                    assertThat(next.getOccurrenceNumber()).isEqualTo(2);
                    assertThat(next.getStatus()).isEqualTo(ReceivableStatus.PENDENTE);
                });
        assertThatThrownBy(() -> confirmService.confirm(receivable.id(), ConfirmReceivableRequest.builder()
                .receivedDate(LocalDate.now())
                .build()))
                .isInstanceOf(ValidationException.class);
        assertThat(historyRepository.findByReceivableIdOrderByChangedAtAsc(receivable.id()))
                .extracting(history -> history.getStatus())
                .containsExactly(ReceivableStatus.PENDENTE, ReceivableStatus.RECEBIDA);
    }

    @Test
    void rejectsPartialReceiptAndHidesReceivablesFromOtherFamiliesAndDependents() {
        User principal = createUser(Role.PRINCIPAL, "receivable-owner-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var receivable = create(ReceivableRecurrence.SEM_RECORRENCIA, LocalDate.now().plusDays(1));
        assertThatThrownBy(() -> confirmService.confirm(receivable.id(), ConfirmReceivableRequest.builder()
                .receivedDate(LocalDate.now())
                .amount(new BigDecimal("99.99"))
                .build()))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("igual ao valor esperado");

        User dependent = createUser(
                Role.DEPENDENTE, "receivable-dependent-" + UUID.randomUUID() + "@aurora.com",
                principal.getFamilyGroup());
        setAuthenticatedUser(dependent);
        assertThatThrownBy(() -> listService.list()).isInstanceOf(AccessDeniedException.class);

        User otherPrincipal = createUser(
                Role.PRINCIPAL, "receivable-other-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(otherPrincipal);
        assertThat(listService.list().receivables()).isEmpty();
        assertThatThrownBy(() -> updateService.update(receivable.id(), UpdateReceivableRequest.builder()
                .description("Acesso indevido")
                .expectedAmount(new BigDecimal("100.00"))
                .expectedDate(LocalDate.now())
                .build()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @WithMockUser(roles = "DEPENDENTE")
    void endpointRejectsDependent() throws Exception {
        mockMvc.perform(get("/api/receivables"))
                .andExpect(status().isForbidden());
    }

    @Test
    void overdueReceivableCanBeRescheduledBackToPendingWithHistory() {
        User principal = createUser(Role.PRINCIPAL, "receivable-overdue-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var receivable = create(ReceivableRecurrence.SEM_RECORRENCIA, LocalDate.now().minusDays(1));

        assertThat(listService.list().receivables())
                .filteredOn(item -> item.id().equals(receivable.id()))
                .singleElement()
                .extracting(item -> item.status())
                .isEqualTo(ReceivableStatus.ATRASADA);
        assertThat(overdueService.markOverdue(LocalDate.now())).isEqualTo(1);

        LocalDate newDate = LocalDate.now().plusDays(10);
        updateService.update(receivable.id(), UpdateReceivableRequest.builder()
                .description("Recebimento reagendado")
                .expectedAmount(new BigDecimal("100.00"))
                .expectedDate(newDate)
                .build());

        var updated = receivableRepository.findById(receivable.id()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(ReceivableStatus.PENDENTE);
        assertThat(historyRepository.findByReceivableIdOrderByChangedAtAsc(receivable.id()))
                .last()
                .satisfies(history -> {
                    assertThat(history.getPreviousStatus()).isEqualTo(ReceivableStatus.ATRASADA);
                    assertThat(history.getStatus()).isEqualTo(ReceivableStatus.PENDENTE);
                    assertThat(history.getPreviousExpectedDate()).isEqualTo(LocalDate.now().minusDays(1));
                    assertThat(history.getExpectedDate()).isEqualTo(newDate);
                });
    }

    @Test
    void recurrenceEditPreservesDayThirtyOneAndCancellationCanStopFutureOccurrences() {
        User principal = createUser(Role.PRINCIPAL, "receivable-series-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var first = create(ReceivableRecurrence.MENSAL, LocalDate.of(2027, 1, 31));
        UUID secondId = confirmService.confirm(first.id(), ConfirmReceivableRequest.builder()
                .receivedDate(LocalDate.of(2027, 1, 31))
                .build()).nextOccurrenceId();

        recurrenceService.update(first.id(), UpdateReceivableRecurrenceRequest.builder()
                .description("Renda mensal revisada")
                .expectedAmount(new BigDecimal("125.00"))
                .nextExpectedDate(LocalDate.of(2027, 2, 28))
                .recurrenceDay(31)
                .build());
        var second = receivableRepository.findById(secondId).orElseThrow();
        assertThat(second.getExpectedDate()).isEqualTo(LocalDate.of(2027, 2, 28));
        assertThat(second.getExpectedAmount()).isEqualByComparingTo("125.00");
        assertThat(second.getSeries().getNextExpectedDate()).isEqualTo(LocalDate.of(2027, 3, 31));

        var cancellation = cancelService.cancel(secondId, CancelReceivableRequest.builder()
                .scope(CancellationScope.OCORRENCIA_E_FUTURAS)
                .build());
        assertThat(cancellation.cancelledReceivableIds()).containsExactly(secondId);
        assertThat(cancellation.recurrenceActive()).isFalse();
        assertThat(receivableRepository.findById(secondId).orElseThrow().getStatus())
                .isEqualTo(ReceivableStatus.CANCELADA);
        assertThat(seriesRepository.findForUpdate(
                first.recurrenceSeriesId(), principal.getFamilyGroup().getId()).orElseThrow().isActive()).isFalse();
    }

    @Test
    void cancellingOnlyOneOccurrenceKeepsSeriesAndCreatesItsSuccessor() {
        User principal = createUser(Role.PRINCIPAL, "receivable-cancel-" + UUID.randomUUID() + "@aurora.com", null);
        setAuthenticatedUser(principal);
        var receivable = create(ReceivableRecurrence.MENSAL, LocalDate.of(2027, 1, 31));

        var cancellation = cancelService.cancel(receivable.id(), CancelReceivableRequest.builder()
                .scope(CancellationScope.SOMENTE_OCORRENCIA)
                .build());

        assertThat(cancellation.recurrenceActive()).isTrue();
        assertThat(receivableRepository.findById(receivable.id()).orElseThrow().getStatus())
                .isEqualTo(ReceivableStatus.CANCELADA);
        assertThat(receivableRepository.findBySeriesIdAndOccurrenceNumber(receivable.recurrenceSeriesId(), 2))
                .get()
                .extracting(occurrence -> occurrence.getExpectedDate())
                .isEqualTo(LocalDate.of(2027, 2, 28));
    }

    private br.com.aurora.features.receivables.createreceivable.CreateReceivableResponse create(
            ReceivableRecurrence recurrence,
            LocalDate expectedDate
    ) {
        return createService.create(CreateReceivableRequest.builder()
                .description("Renda teste")
                .expectedAmount(new BigDecimal("100.00"))
                .expectedDate(expectedDate)
                .recurrence(recurrence)
                .build());
    }
}
