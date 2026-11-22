package br.com.aurora.features.reportsanalytics;

import br.com.aurora.shared.error.ValidationException;

import java.time.DateTimeException;
import java.time.YearMonth;

public final class ReportMonthParser {

    private ReportMonthParser() {
    }

    public static YearMonth parseRequired(String value) {
        if (value == null || !value.matches("[0-9]{4}-(0[1-9]|1[0-2])")) {
            throw new ValidationException("O período é obrigatório e deve estar no formato AAAA-MM.");
        }
        try {
            YearMonth month = YearMonth.parse(value);
            if (month.getYear() == 0) {
                throw new ValidationException("O período deve conter um ano válido.");
            }
            return month;
        } catch (DateTimeException exception) {
            throw new ValidationException("O período deve estar no formato AAAA-MM.");
        }
    }
}
