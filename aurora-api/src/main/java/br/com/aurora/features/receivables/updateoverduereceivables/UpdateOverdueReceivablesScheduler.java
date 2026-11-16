package br.com.aurora.features.receivables.updateoverduereceivables;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class UpdateOverdueReceivablesScheduler {

    private final UpdateOverdueReceivablesService service;

    @Scheduled(cron = "0 15 0 * * *")
    public void updateOverdueReceivables() {
        service.markOverdue(LocalDate.now());
    }
}
