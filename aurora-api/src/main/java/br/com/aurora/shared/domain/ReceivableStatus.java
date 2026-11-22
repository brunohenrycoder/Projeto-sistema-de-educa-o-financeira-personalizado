package br.com.aurora.shared.domain;

import java.time.LocalDate;

public enum ReceivableStatus {
    PENDENTE,
    RECEBIDA,
    ATRASADA,
    CANCELADA;

    public static ReceivableStatus forExpectedDate(
            ReceivableStatus current,
            LocalDate expectedDate,
            LocalDate today
    ) {
        if (current == PENDENTE && expectedDate.isBefore(today)) {
            return ATRASADA;
        }
        if (current == ATRASADA && !expectedDate.isBefore(today)) {
            return PENDENTE;
        }
        return current;
    }
}
