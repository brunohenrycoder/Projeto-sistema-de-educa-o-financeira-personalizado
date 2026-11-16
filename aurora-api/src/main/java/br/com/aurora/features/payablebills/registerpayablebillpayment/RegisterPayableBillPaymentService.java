package br.com.aurora.features.payablebills.registerpayablebillpayment;

import br.com.aurora.features.payablebills.PayableBillAccess;
import br.com.aurora.shared.domain.CreditCardLedger;
import br.com.aurora.shared.domain.Expense;
import br.com.aurora.shared.domain.ExpensePaymentMethod;
import br.com.aurora.shared.domain.ExpenseRepository;
import br.com.aurora.shared.domain.PayableBill;
import br.com.aurora.shared.domain.PayableBillDates;
import br.com.aurora.shared.domain.PayableBillPayment;
import br.com.aurora.shared.domain.PayableBillPaymentRepository;
import br.com.aurora.shared.domain.PayableBillRecurrence;
import br.com.aurora.shared.domain.PayableBillRepository;
import br.com.aurora.shared.domain.PayableBillSeries;
import br.com.aurora.shared.domain.PayableBillSeriesRepository;
import br.com.aurora.shared.domain.PayableBillStatus;
import br.com.aurora.shared.domain.PayableBillStatusHistory;
import br.com.aurora.shared.domain.PayableBillStatusHistoryRepository;
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
public class RegisterPayableBillPaymentService {

    private final PayableBillAccess access;
    private final PayableBillRepository billRepository;
    private final PayableBillSeriesRepository seriesRepository;
    private final PayableBillPaymentRepository paymentRepository;
    private final PayableBillStatusHistoryRepository historyRepository;
    private final ExpenseRepository expenseRepository;
    private final CreditCardLedger creditCardLedger;

    @Transactional
    public RegisterPayableBillPaymentResponse register(
            UUID billId,
            RegisterPayableBillPaymentRequest request
    ) {
        var principal = access.requirePrincipal();
        if (request == null || request.getPaymentDate() == null || request.getPaymentMethod() == null) {
            throw new ValidationException("A data e o método de pagamento são obrigatórios.");
        }
        if (request.getAmount() != null
                && (request.getAmount().signum() <= 0 || request.getAmount().scale() > 2
                || request.getAmount().precision() - request.getAmount().scale() > 10)) {
            throw new ValidationException("O valor pago deve ser positivo e ter no máximo duas casas decimais.");
        }
        PayableBill billReference = billRepository.findByIdAndFamilyGroupId(
                        billId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conta a pagar não encontrada."));
        PayableBillSeries series = seriesRepository.findForUpdate(billReference.getSeries().getId(),
                        principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recorrência da conta não encontrada."));
        PayableBill bill = billRepository.findForUpdate(billId, principal.getFamilyGroup().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conta a pagar não encontrada."));
        if (bill.getStatus() == PayableBillStatus.PAGA || bill.getStatus() == PayableBillStatus.CANCELADA
                || paymentRepository.findByBillId(bill.getId()).isPresent()) {
            throw new ValidationException("Esta conta já foi paga ou cancelada.");
        }

        BigDecimal amount = request.getAmount() == null ? bill.getAmount() : request.getAmount();
        if (amount.compareTo(bill.getAmount()) != 0) {
            throw new ValidationException("A conta deve ser quitada integralmente em um único pagamento.");
        }

        Expense expense = expenseRepository.save(Expense.builder()
                .familyGroup(principal.getFamilyGroup())
                .user(principal)
                .amount(amount)
                .expenseDate(request.getPaymentDate())
                .category(bill.getCategory().name())
                .paymentMethod(request.getPaymentMethod())
                .description(bill.getDescription())
                .build());
        if (request.getPaymentMethod() == ExpensePaymentMethod.CARTAO_CREDITO) {
            creditCardLedger.registerPurchase(expense, 1);
        }

        PayableBillPayment payment = paymentRepository.save(PayableBillPayment.builder()
                .bill(bill)
                .expense(expense)
                .paidBy(principal)
                .amount(amount)
                .paymentDate(request.getPaymentDate())
                .paymentMethod(request.getPaymentMethod())
                .build());
        bill.setStatus(PayableBillStatus.PAGA);
        bill.setUpdatedBy(principal);
        historyRepository.save(PayableBillStatusHistory.builder()
                .bill(bill)
                .changedBy(principal)
                .status(PayableBillStatus.PAGA)
                .build());

        if (series.isActive() && series.getRecurrence() == PayableBillRecurrence.MENSAL) {
            createNextOccurrence(series, principal);
        }
        return new RegisterPayableBillPaymentResponse(
                payment.getId(), bill.getId(), expense.getId(), payment.getAmount(),
                payment.getPaymentDate(), payment.getPaymentMethod(), bill.getStatus()
        );
    }

    private void createNextOccurrence(PayableBillSeries series, br.com.aurora.shared.domain.User principal) {
        int occurrenceNumber = series.getNextOccurrenceNumber();
        if (billRepository.findBySeriesIdAndOccurrenceNumber(series.getId(), occurrenceNumber).isEmpty()) {
            LocalDate dueDate = series.getNextDueDate();
            PayableBillStatus status = dueDate.isBefore(LocalDate.now())
                    ? PayableBillStatus.ATRASADA
                    : PayableBillStatus.PENDENTE;
            PayableBill next = billRepository.save(PayableBill.builder()
                    .familyGroup(series.getFamilyGroup())
                    .series(series)
                    .createdBy(principal)
                    .occurrenceNumber(occurrenceNumber)
                    .description(series.getDescription())
                    .amount(series.getAmount())
                    .dueDate(dueDate)
                    .category(series.getCategory())
                    .recurrence(series.getRecurrence())
                    .status(status)
                    .build());
            historyRepository.save(PayableBillStatusHistory.builder()
                    .bill(next)
                    .changedBy(principal)
                    .status(status)
                    .build());
            series.setNextOccurrenceNumber(occurrenceNumber + 1);
            series.setNextDueDate(PayableBillDates.nextMonthlyDate(dueDate, series.getRecurrenceDay()));
        }
    }
}
