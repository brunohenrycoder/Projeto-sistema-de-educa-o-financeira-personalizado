package br.com.aurora.shared.email;

public interface EmailSender {
    void sendEmailConfirmation(String recipient, String confirmationLink);
}
