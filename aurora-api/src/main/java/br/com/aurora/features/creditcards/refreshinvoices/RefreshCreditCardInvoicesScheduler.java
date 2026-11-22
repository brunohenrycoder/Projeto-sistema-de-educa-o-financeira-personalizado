package br.com.aurora.features.creditcards.refreshinvoices;

import br.com.aurora.shared.domain.CreditCardLedger;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefreshCreditCardInvoicesScheduler {

    private final CreditCardLedger creditCardLedger;

    @Scheduled(cron = "0 5 0 * * *")
    public void refreshInvoiceStatuses() {
        creditCardLedger.refreshDueInvoices();
    }
}
