package br.com.aurora.features.payablebills.updateoverduepayablebills;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class UpdateOverduePayableBillsScheduler {

    private final UpdateOverduePayableBillsService service;

    @Scheduled(cron = "0 10 0 * * *")
    public void updateOverdueBills() {
        service.markOverdue(LocalDate.now());
    }
}
