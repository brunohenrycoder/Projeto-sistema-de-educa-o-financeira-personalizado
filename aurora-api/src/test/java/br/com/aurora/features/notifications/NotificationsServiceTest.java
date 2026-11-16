package br.com.aurora.features.notifications;

import br.com.aurora.features.expenses.ExpenseServiceTestSupport;
import br.com.aurora.features.notifications.checkfinancialoverviewalerts.CheckFinancialOverviewAlertsService;
import br.com.aurora.features.notifications.checkpayablebillreminders.CheckPayableBillRemindersService;
import br.com.aurora.features.notifications.listnotifications.ListNotificationsService;
import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.ExpenseStatus;
import br.com.aurora.shared.domain.NotificationRepository;
import br.com.aurora.shared.domain.NotificationType;
import br.com.aurora.shared.domain.PayableBill;
import br.com.aurora.shared.domain.PayableBillCategory;
import br.com.aurora.shared.domain.PayableBillRecurrence;
import br.com.aurora.shared.domain.PayableBillRepository;
import br.com.aurora.shared.domain.PayableBillSeries;
import br.com.aurora.shared.domain.PayableBillSeriesRepository;
import br.com.aurora.shared.domain.PayableBillStatus;
import br.com.aurora.shared.domain.Receivable;
import br.com.aurora.shared.domain.ReceivableConfirmation;
import br.com.aurora.shared.domain.ReceivableConfirmationRepository;
import br.com.aurora.shared.domain.ReceivableRecurrence;
import br.com.aurora.shared.domain.ReceivableRepository;
import br.com.aurora.shared.domain.ReceivableSeries;
import br.com.aurora.shared.domain.ReceivableSeriesRepository;
import br.com.aurora.shared.domain.ReceivableStatus;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.security.UsuarioAutenticado;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class NotificationsServiceTest extends ExpenseServiceTestSupport {

    @Autowired private CheckFinancialOverviewAlertsService alertsService;
    @Autowired private CheckPayableBillRemindersService remindersService;
    @Autowired private ListNotificationsService listService;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private ReceivableSeriesRepository receivableSeriesRepository;
    @Autowired private ReceivableRepository receivableRepository;
    @Autowired private ReceivableConfirmationRepository confirmationRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private PayableBillSeriesRepository payableBillSeriesRepository;
    @Autowired private PayableBillRepository payableBillRepository;
    @Autowired private MockMvc mockMvc;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void principalReadsOnlyOwnFamilyNotificationsWithoutChangingThem() throws Exception {
        User principal = createUser(Role.PRINCIPAL, uniqueEmail(), null);
        User otherPrincipal = createUser(Role.PRINCIPAL, uniqueEmail(), null);
        LocalDate month = LocalDate.of(2026, 11, 1);
        addIncome(principal, month, "100.00");
        addExpense(principal, month.plusDays(1), "80.00");
        addIncome(otherPrincipal, month, "100.00");
        addExpense(otherPrincipal, month.plusDays(1), "80.00");
        alertsService.checkFamily(principal.getFamilyGroup().getId(), java.time.YearMonth.from(month));
        alertsService.checkFamily(otherPrincipal.getFamilyGroup().getId(), java.time.YearMonth.from(month));

        long countBefore = notificationRepository.count();
        var savedNotification = notificationRepository
                .findByFamilyGroupIdAndTypeAndReferenceMonthAndThresholdPercent(
                        principal.getFamilyGroup().getId(),
                        NotificationType.ALERTA_DESPESAS,
                        month,
                        new BigDecimal("80.00"))
                .orElseThrow();
        UsuarioAutenticado authenticatedPrincipal = UsuarioAutenticado.fromUser(principal);

        mockMvc.perform(get("/api/notifications")
                        .param("familyGroupId", otherPrincipal.getFamilyGroup().getId().toString())
                        .with(authentication(new UsernamePasswordAuthenticationToken(
                                authenticatedPrincipal, null, authenticatedPrincipal.getAuthorities()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications.length()").value(1))
                .andExpect(jsonPath("$.notifications[0].type").value("ALERTA_DESPESAS"))
                .andExpect(jsonPath("$.notifications[0].description").value(savedNotification.getDescription()))
                .andExpect(jsonPath("$.notifications[0].createdAt").exists())
                .andExpect(jsonPath("$.notifications[0].situation").doesNotExist());

        assertThat(notificationRepository.count()).isEqualTo(countBefore);
        assertThat(notificationRepository.findById(savedNotification.getId()).orElseThrow().getCreatedAt())
                .isEqualTo(savedNotification.getCreatedAt());

        setAuthenticatedUser(principal);
        var response = listService.list();
        assertThat(response.notifications()).hasSize(1);
        assertThat(response.notifications().getFirst().type()).isEqualTo(NotificationType.ALERTA_DESPESAS);
    }

    @Test
    void dependentAndAnonymousUsersCannotListNotifications() throws Exception {
        User principal = createUser(Role.PRINCIPAL, uniqueEmail(), null);
        User dependent = createUser(Role.DEPENDENTE, uniqueEmail(), principal.getFamilyGroup());
        @SuppressWarnings("unused")
        UsuarioAutenticado authenticatedPrincipal = UsuarioAutenticado.fromUser(principal);

        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/notifications").with(user("dependent").roles("DEPENDENTE")))
                .andExpect(status().isForbidden());

        setAuthenticatedUser(dependent);
        assertThatThrownBy(() -> listService.list())
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test
    void remindersCoverThreeDaysAndOverdueBillsAndAreIdempotentPerDay() throws Exception {
        User principal = createUser(Role.PRINCIPAL, uniqueEmail(), null);
        LocalDate today = LocalDate.of(2026, 11, 16);
        PayableBill upcoming = addBill(principal, today.plusDays(3), PayableBillStatus.PENDENTE, "Vence logo");
        PayableBill overdue = addBill(principal, today.minusDays(1), PayableBillStatus.ATRASADA, "Conta atrasada");
        addBill(principal, today.plusDays(4), PayableBillStatus.PENDENTE, "Ainda distante");
        addBill(principal, today.plusDays(2), PayableBillStatus.PAGA, "Já paga");
        addBill(principal, today.plusDays(2), PayableBillStatus.CANCELADA, "Cancelada");

        runConcurrently(principal, today);
        remindersService.checkFamily(principal.getFamilyGroup().getId(), today);

        assertThat(notificationRepository.countByFamilyGroupIdAndTypeAndPayableBillIdAndNotificationDate(
                principal.getFamilyGroup().getId(), NotificationType.LEMBRETE_VENCIMENTO, upcoming.getId(), today))
                .isEqualTo(1);
        assertThat(notificationRepository.countByFamilyGroupIdAndTypeAndPayableBillIdAndNotificationDate(
                principal.getFamilyGroup().getId(), NotificationType.LEMBRETE_VENCIMENTO, overdue.getId(), today))
                .isEqualTo(1);
        assertThat(notificationRepository.findByFamilyGroupIdOrderByCreatedAtDesc(principal.getFamilyGroup().getId()))
                .extracting(notification -> notification.getDescription())
                .anyMatch(description -> description.contains("está atrasada"));

        upcoming.setStatus(PayableBillStatus.PAGA);
        payableBillRepository.save(upcoming);
        remindersService.checkFamily(principal.getFamilyGroup().getId(), today.plusDays(1));
        assertThat(notificationRepository.countByFamilyGroupIdAndTypeAndPayableBillIdAndNotificationDate(
                principal.getFamilyGroup().getId(), NotificationType.LEMBRETE_VENCIMENTO, upcoming.getId(),
                today.plusDays(1))).isZero();
        assertThat(notificationRepository.countByFamilyGroupIdAndTypeAndPayableBillIdAndNotificationDate(
                principal.getFamilyGroup().getId(), NotificationType.LEMBRETE_VENCIMENTO, overdue.getId(),
                today.plusDays(1))).isEqualTo(1);
    }

    private void runConcurrently(User principal, LocalDate today) throws Exception {
        int threadCount = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> checks = new ArrayList<>();
        try {
            for (int i = 0; i < threadCount; i++) {
                checks.add(executor.submit(() -> {
                    ready.countDown();
                    start.await();
                    remindersService.checkFamily(principal.getFamilyGroup().getId(), today);
                    return null;
                }));
            }
            ready.await();
            start.countDown();
            for (Future<?> check : checks) {
                check.get();
            }
        } finally {
            executor.shutdownNow();
        }
    }

    private void addIncome(User principal, LocalDate date, String amount) {
        BigDecimal value = new BigDecimal(amount);
        ReceivableSeries series = receivableSeriesRepository.save(ReceivableSeries.builder()
                .familyGroup(principal.getFamilyGroup())
                .createdBy(principal)
                .description("Renda de teste")
                .expectedAmount(value)
                .recurrence(ReceivableRecurrence.SEM_RECORRENCIA)
                .nextExpectedDate(date)
                .nextOccurrenceNumber(2)
                .recurrenceDay(date.getDayOfMonth())
                .active(false)
                .build());
        Receivable receivable = receivableRepository.save(Receivable.builder()
                .familyGroup(principal.getFamilyGroup())
                .series(series)
                .createdBy(principal)
                .occurrenceNumber(1)
                .description("Renda de teste")
                .expectedAmount(value)
                .expectedDate(date)
                .recurrence(ReceivableRecurrence.SEM_RECORRENCIA)
                .status(ReceivableStatus.RECEBIDA)
                .build());
        confirmationRepository.save(ReceivableConfirmation.builder()
                .receivable(receivable)
                .receivedBy(principal)
                .amount(value)
                .receivedDate(date)
                .build());
    }

    private void addExpense(User user, LocalDate date, String amount) {
        expenseRepository.save(Expense.builder()
                .familyGroup(user.getFamilyGroup())
                .user(user)
                .amount(new BigDecimal(amount))
                .expenseDate(date)
                .category("OUTROS")
                .paymentMethod(ExpensePaymentMethod.PIX)
                .status(ExpenseStatus.ATIVO)
                .build());
    }

    private PayableBill addBill(User principal, LocalDate dueDate, PayableBillStatus status, String description) {
        BigDecimal amount = new BigDecimal("25.00");
        PayableBillSeries series = payableBillSeriesRepository.save(PayableBillSeries.builder()
                .familyGroup(principal.getFamilyGroup())
                .createdBy(principal)
                .description(description)
                .amount(amount)
                .category(PayableBillCategory.OUTROS)
                .recurrence(PayableBillRecurrence.SEM_RECORRENCIA)
                .nextDueDate(dueDate)
                .nextOccurrenceNumber(2)
                .recurrenceDay(dueDate.getDayOfMonth())
                .active(false)
                .build());
        return payableBillRepository.save(PayableBill.builder()
                .familyGroup(principal.getFamilyGroup())
                .series(series)
                .createdBy(principal)
                .occurrenceNumber(1)
                .description(description)
                .amount(amount)
                .dueDate(dueDate)
                .category(PayableBillCategory.OUTROS)
                .recurrence(PayableBillRecurrence.SEM_RECORRENCIA)
                .status(status)
                .build());
    }

    private String uniqueEmail() {
        return UUID.randomUUID() + "@aurora.com";
    }
}
