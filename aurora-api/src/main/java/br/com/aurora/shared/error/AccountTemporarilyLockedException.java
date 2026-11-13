package br.com.aurora.shared.error;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class AccountTemporarilyLockedException extends RuntimeException {

    private final LocalDateTime lockedUntil;

    public AccountTemporarilyLockedException(LocalDateTime lockedUntil) {
        super("Acesso temporariamente bloqueado. Tente novamente após "
                + lockedUntil.format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm")) + ".");
        this.lockedUntil = lockedUntil;
    }

    public LocalDateTime getLockedUntil() {
        return lockedUntil;
    }
}
