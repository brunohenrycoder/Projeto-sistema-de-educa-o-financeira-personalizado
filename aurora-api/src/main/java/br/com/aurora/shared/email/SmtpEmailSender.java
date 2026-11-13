package br.com.aurora.shared.email;

import br.com.aurora.shared.error.EmailDeliveryException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SmtpEmailSender implements EmailSender {

    private final JavaMailSender mailSender;

    @Value("${app.mail-from:}")
    private String fromAddress;

    @Override
    public void sendEmailConfirmation(String recipient, String confirmationLink) {
        sendGenericEmail(recipient, "Confirme seu e-mail - Aurora",
                """
                Para confirmar seu endereço de e-mail, acesse o link abaixo. O link expira em 24 horas.

                %s
                """.formatted(confirmationLink));
    }

    @Override
    public void sendFamilyInvite(String recipient, String inviteLink) {
        sendGenericEmail(recipient, "Convite para o Aurora",
                """
                Você foi convidado para participar do grupo familiar no Aurora.
                Acesse o link abaixo para concluir o cadastro do seu perfil de Dependente.

                %s
                """.formatted(inviteLink));
    }

    private void sendGenericEmail(String recipient, String subject, String body) {
        if (fromAddress == null || fromAddress.isBlank()) {
            throw new EmailDeliveryException("O remetente do e-mail não está configurado.");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);

        try {
            mailSender.send(message);
        } catch (MailException exception) {
            throw new EmailDeliveryException("Não foi possível enviar o e-mail de confirmação.", exception);
        }
    }
}
