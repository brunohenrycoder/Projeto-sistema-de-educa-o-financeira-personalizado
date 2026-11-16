package br.com.aurora.shared.domain;

import java.time.LocalDate;
import java.time.YearMonth;

public final class PayableBillDates {

    private PayableBillDates() {
    }

    public static LocalDate nextMonthlyDate(LocalDate date, int recurrenceDay) {
        YearMonth nextMonth = YearMonth.from(date).plusMonths(1);
        return nextMonth.atDay(Math.min(recurrenceDay, nextMonth.lengthOfMonth()));
    }
}
