package br.com.aurora.shared.domain;

import br.com.aurora.shared.error.ResourceNotFoundException;
import br.com.aurora.shared.error.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CreditCardLedger {

    private static final BigDecimal CENT = new BigDecimal("0.01");
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final CreditCardRepository cardRepository;
    private final CreditCardInvoiceRepository invoiceRepository;
    private final CreditCardInstallmentRepository installmentRepository;
    private final CreditCardRefundRepository refundRepository;
    private final CreditCardRefundCreditRepository refundCreditRepository;
    private final CreditCardCreditApplicationRepository creditApplicationRepository;

    @Transactional
    public void registerPurchase(Expense expense, int installmentCount) {
        CreditCard card = cardRepository.findActiveForUpdate(expense.getFamilyGroup().getId())
                .orElseThrow(() -> new ValidationException(
                        "Não há cartão de crédito ativo disponível para este grupo familiar."
                ));
        saveInstallments(expense, card, installmentCount);
    }

    @Transactional
    public void replaceOpenPurchase(Expense expense, int installmentCount) {
        List<CreditCardInstallment> installments = installmentRepository.findByExpenseIdOrderByInstallmentNumber(
                expense.getId()
        ).stream().filter(installment -> !installment.isCancelled()).toList();
        if (installments.isEmpty()) {
            throw new ResourceNotFoundException("Parcelas da despesa não encontradas.");
        }
        ensureEditable(installments, expense.getId());

        CreditCard card = installments.getFirst().getInvoice().getCard();
        for (CreditCardInstallment installment : installments) {
            CreditCardInvoice invoice = installment.getInvoice();
            invoice.setTotalAmount(invoice.getTotalAmount().subtract(installment.getAmount()));
            installment.setCancelled(true);
            installmentRepository.save(installment);
            refreshInvoice(invoice);
            invoiceRepository.save(invoice);
        }
        installmentRepository.flush();
        saveInstallments(expense, card, installmentCount);
    }

    @Transactional
    public void cancelOpenPurchase(Expense expense) {
        List<CreditCardInstallment> installments = installmentRepository.findByExpenseIdOrderByInstallmentNumber(
                expense.getId()
        ).stream().filter(installment -> !installment.isCancelled()).toList();
        if (installments.isEmpty()) {
            return;
        }
        ensureEditable(installments, expense.getId());
        for (CreditCardInstallment installment : installments) {
            CreditCardInvoice invoice = installment.getInvoice();
            invoice.setTotalAmount(invoice.getTotalAmount().subtract(installment.getAmount()));
            installment.setCancelled(true);
            installmentRepository.save(installment);
            refreshInvoice(invoice);
            invoiceRepository.save(invoice);
        }
    }

    @SuppressWarnings("null")
    @Transactional
    public List<CreditCardInstallment> findUnbilledInstallmentsForRefund(UUID expenseId) {
        List<CreditCardInstallment> installments = installmentRepository.findByExpenseIdOrderByInstallmentNumber(
                expenseId
        ).stream().filter(installment -> !installment.isCancelled()).toList();
        if (installments.isEmpty()) {
            return List.of();
        }
        cardRepository.findForUpdateById(installments.getFirst().getInvoice().getCard().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Cartão da compra não encontrado."));
        List<CreditCardInvoice> invoices = invoiceRepository.findByExpenseForUpdate(expenseId);
        for (CreditCardInvoice invoice : invoices) {
            refreshInvoice(invoice);
            invoiceRepository.save(invoice);
        }
        return installments.stream()
                .filter(installment -> installment.getInvoice().getStatus() == CreditCardInvoiceStatus.OPEN)
                .sorted(java.util.Comparator
                        .comparing((CreditCardInstallment installment) -> installment.getInvoice().getDueDate())
                        .thenComparingInt(CreditCardInstallment::getInstallmentNumber))
                .toList();
    }

    public BigDecimal getCommittedAmount(UUID cardId) {
        return installmentRepository.sumCommittedAmountByCardId(cardId).max(ZERO);
    }

    @Transactional
    public void assertOpenPurchaseEditable(Expense expense) {
        List<CreditCardInstallment> installments = installmentRepository.findByExpenseIdOrderByInstallmentNumber(
                expense.getId()
        ).stream().filter(installment -> !installment.isCancelled()).toList();
        if (!installments.isEmpty()) {
            ensureEditable(installments, expense.getId());
        }
    }

    public List<BigDecimal> splitAmount(BigDecimal total, int installmentCount) {
        if (installmentCount < 1 || installmentCount > 36) {
            throw new ValidationException("A compra deve ter de 1 a 36 parcelas.");
        }
        if (total.setScale(2, RoundingMode.UNNECESSARY).compareTo(CENT.multiply(
                BigDecimal.valueOf(installmentCount)
        )) < 0) {
            throw new ValidationException("O valor não permite parcelas de pelo menos R$ 0,01.");
        }
        BigDecimal base = total.divide(BigDecimal.valueOf(installmentCount), 2, RoundingMode.DOWN);
        BigDecimal last = total.subtract(base.multiply(BigDecimal.valueOf(installmentCount - 1L)));
        List<BigDecimal> amounts = new ArrayList<>(installmentCount);
        for (int index = 0; index < installmentCount - 1; index++) {
            amounts.add(base);
        }
        amounts.add(last);
        return amounts;
    }

    @Transactional
    public BigDecimal applyPendingCredits(CreditCardInvoice invoice) {
        if (invoice.getStatus() != CreditCardInvoiceStatus.OPEN) {
            return ZERO;
        }
        List<CreditCardRefundCredit> credits = refundCreditRepository
                .findByCardIdAndRemainingAmountGreaterThanOrderByIdAsc(invoice.getCard().getId(), ZERO);
        BigDecimal appliedTotal = ZERO;
        for (CreditCardRefundCredit credit : credits) {
            BigDecimal balance = invoice.getOutstandingAmount();
            if (balance.signum() <= 0) {
                break;
            }
            BigDecimal applied = credit.getRemainingAmount().min(balance);
            if (applied.signum() <= 0) {
                continue;
            }
            BigDecimal allocated = allocateCredit(invoice, credit, applied);
            appliedTotal = appliedTotal.add(allocated);
        }
        invoiceRepository.save(invoice);
        return appliedTotal;
    }

    @Transactional
    public BigDecimal applyCreditToNextOpenInvoice(CreditCardRefundCredit credit) {
        List<CreditCardInvoice> openInvoices = invoiceRepository.findOpenForUpdate(
                credit.getCard().getId(),
                CreditCardInvoiceStatus.OPEN
        );
        if (openInvoices.isEmpty()) {
            return ZERO;
        }
        BigDecimal applied = ZERO;
        for (CreditCardInvoice invoice : openInvoices) {
            if (credit.getRemainingAmount().signum() <= 0) {
                break;
            }
            BigDecimal value = credit.getRemainingAmount().min(invoice.getOutstandingAmount());
            if (value.signum() <= 0) {
                continue;
            }
            applied = applied.add(allocateCredit(invoice, credit, value));
        }
        return applied;
    }

    @Transactional
    public void refreshDueInvoices() {
        LocalDate today = LocalDate.now();
        List<CreditCardInvoice> invoices = invoiceRepository.findInvoicesToRefresh(
                List.of(
                        CreditCardInvoiceStatus.OPEN,
                        CreditCardInvoiceStatus.CLOSED,
                        CreditCardInvoiceStatus.PARTIALLY_PAID
                ),
                today
        );
        for (CreditCardInvoice invoice : invoices) {
            refreshInvoice(invoice);
        }
        invoiceRepository.saveAll(invoices);
    }

    public void refreshInvoice(CreditCardInvoice invoice) {
        BigDecimal outstanding = invoice.getOutstandingAmount();
        if (outstanding.signum() == 0) {
            invoice.setStatus(CreditCardInvoiceStatus.PAID);
        } else if (invoice.getDueDate().isBefore(LocalDate.now())) {
            invoice.setStatus(CreditCardInvoiceStatus.OVERDUE);
        } else if (invoice.getPaidAmount().signum() > 0) {
            invoice.setStatus(CreditCardInvoiceStatus.PARTIALLY_PAID);
        } else if (!invoice.getClosingDate().isAfter(LocalDate.now())) {
            invoice.setStatus(CreditCardInvoiceStatus.CLOSED);
        } else {
            invoice.setStatus(CreditCardInvoiceStatus.OPEN);
        }
    }

    private void saveInstallments(Expense expense, CreditCard card, int installmentCount) {
        List<BigDecimal> amounts = splitAmount(expense.getAmount(), installmentCount);
        LocalDate baseClosingDate = getClosingDate(expense.getExpenseDate(), card.getClosingDay());
        for (int index = 0; index < installmentCount; index++) {
            LocalDate closingDate = baseClosingDate.plusMonths(index);
            LocalDate cycleStart = closingDate.minusMonths(1).plusDays(1);
            CreditCardInvoice invoice = invoiceRepository.findByCardIdAndCycleStartForUpdate(card.getId(), cycleStart)
                    .orElseGet(() -> createInvoice(card, cycleStart, closingDate));
            invoice.setTotalAmount(invoice.getTotalAmount().add(amounts.get(index)));
            refreshInvoice(invoice);
            invoiceRepository.save(invoice);
            @SuppressWarnings("unused")
            CreditCardInstallment installment = installmentRepository.save(CreditCardInstallment.builder()
                    .invoice(invoice)
                    .expense(expense)
                    .installmentNumber(index + 1)
                    .installmentCount(installmentCount)
                    .amount(amounts.get(index))
                    .paidAmount(ZERO)
                    .refundedAmount(ZERO)
                    .creditedAmount(ZERO)
                    .cancelled(false)
                    .build());
            applyPendingCredits(invoice);
        }
    }

    private CreditCardInvoice createInvoice(CreditCard card, LocalDate cycleStart, LocalDate closingDate) {
        LocalDate dueDate = closingDate.plusMonths(1).withDayOfMonth(card.getDueDay());
        return invoiceRepository.save(CreditCardInvoice.builder()
                .card(card)
                .familyGroup(card.getFamilyGroup())
                .cycleStart(cycleStart)
                .closingDate(closingDate)
                .dueDate(dueDate)
                .status(CreditCardInvoiceStatus.OPEN)
                .totalAmount(ZERO)
                .paidAmount(ZERO)
                .creditAmount(ZERO)
                .build());
    }

    private LocalDate getClosingDate(LocalDate purchaseDate, int closingDay) {
        YearMonth closingMonth = YearMonth.from(purchaseDate);
        if (purchaseDate.getDayOfMonth() > closingDay) {
            closingMonth = closingMonth.plusMonths(1);
        }
        return closingMonth.atDay(closingDay);
    }

    private void ensureEditable(List<CreditCardInstallment> installments, UUID expenseId) {
        cardRepository.findForUpdateById(installments.getFirst().getInvoice().getCard().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Cartão da compra não encontrado."));
        List<CreditCardInvoice> invoices = invoiceRepository.findByExpenseForUpdate(expenseId);
        for (CreditCardInvoice invoice : invoices) {
            refreshInvoice(invoice);
            invoiceRepository.save(invoice);
        }
        if (refundRepository.sumAmountByExpenseId(expenseId).signum() > 0
                || installments.stream().anyMatch(installment ->
                installment.getInvoice().getStatus() != CreditCardInvoiceStatus.OPEN
                        || installment.getPaidAmount().signum() > 0
                        || installment.getRefundedAmount().signum() > 0
                        || installment.getCreditedAmount().signum() > 0)) {
            throw new ValidationException(
                    "Despesas com faturas fechadas ou movimentações financeiras não podem ser alteradas diretamente."
            );
        }
    }

    private BigDecimal allocateCredit(
            CreditCardInvoice invoice,
            CreditCardRefundCredit credit,
            BigDecimal requestedAmount
    ) {
        BigDecimal remaining = requestedAmount.min(invoice.getOutstandingAmount());
        BigDecimal allocatedTotal = ZERO;
        for (CreditCardInstallment installment : installmentRepository
                .findByInvoiceIdOrderByExpenseExpenseDateAscInstallmentNumberAsc(invoice.getId())) {
            BigDecimal available = installment.getOutstandingAmount();
            if (available.signum() <= 0 || remaining.signum() <= 0) {
                continue;
            }
            BigDecimal allocation = available.min(remaining);
            installment.setCreditedAmount(installment.getCreditedAmount().add(allocation));
            installmentRepository.save(installment);
            creditApplicationRepository.save(CreditCardCreditApplication.builder()
                    .credit(credit)
                    .invoice(invoice)
                    .installment(installment)
                    .amount(allocation)
                    .build());
            remaining = remaining.subtract(allocation);
            allocatedTotal = allocatedTotal.add(allocation);
        }
        if (remaining.signum() > 0) {
            throw new IllegalStateException("O crédito não pôde ser alocado integralmente às parcelas da fatura.");
        }
        credit.setRemainingAmount(credit.getRemainingAmount().subtract(allocatedTotal));
        invoice.setCreditAmount(invoice.getCreditAmount().add(allocatedTotal));
        refundCreditRepository.save(credit);
        refreshInvoice(invoice);
        invoiceRepository.save(invoice);
        return allocatedTotal;
    }
}
