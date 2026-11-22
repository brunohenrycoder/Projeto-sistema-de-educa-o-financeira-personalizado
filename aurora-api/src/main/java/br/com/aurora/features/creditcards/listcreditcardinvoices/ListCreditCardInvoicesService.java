package br.com.aurora.features.creditcards.listcreditcardinvoices;

import br.com.aurora.shared.domain.CreditCardInvoice;
import br.com.aurora.shared.domain.CreditCardInvoiceRepository;
import br.com.aurora.shared.domain.CreditCardInvoiceStatus;
import br.com.aurora.shared.security.CreditCardAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@RequiredArgsConstructor
public class ListCreditCardInvoicesService {

    private final CreditCardAccess access;
    private final CreditCardInvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public ListCreditCardInvoicesResponse list(CreditCardInvoiceStatus status) {
        var principal = access.requirePrincipal();
        return new ListCreditCardInvoicesResponse(invoiceRepository
                .findByFamilyGroupIdOrderByClosingDateDesc(principal.getFamilyGroup().getId())
                .stream()
                .filter(invoice -> status == null || invoice.getStatus() == status)
                .map(this::toResponse)
                .toList());
    }

    private ListCreditCardInvoicesResponse.Invoice toResponse(CreditCardInvoice invoice) {
        return new ListCreditCardInvoicesResponse.Invoice(
                invoice.getId(), invoice.getCard().getId(), invoice.getCycleStart(), invoice.getClosingDate(),
                invoice.getDueDate(), invoice.getStatus(), invoice.getTotalAmount(), invoice.getPaidAmount(),
                invoice.getCreditAmount(), invoice.getOutstandingAmount()
        );
    }
}
