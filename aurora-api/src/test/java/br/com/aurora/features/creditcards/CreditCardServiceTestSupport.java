package br.com.aurora.features.creditcards;

import br.com.aurora.features.expenses.ExpenseServiceTestSupport;
import br.com.aurora.shared.domain.CreditCard;
import br.com.aurora.shared.domain.CreditCardNetwork;
import br.com.aurora.shared.domain.CreditCardRepository;
import br.com.aurora.shared.domain.User;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;

public abstract class CreditCardServiceTestSupport extends ExpenseServiceTestSupport {

    @Autowired
    protected CreditCardRepository creditCardRepository;

    protected CreditCard createCard(User principal, BigDecimal limit, int closingDay, int dueDay) {
        return creditCardRepository.save(CreditCard.builder()
                .familyGroup(principal.getFamilyGroup())
                .name("Cartão da família")
                .issuer("Banco Aurora")
                .network(CreditCardNetwork.VISA)
                .totalLimit(limit)
                .closingDay(closingDay)
                .dueDay(dueDay)
                .active(true)
                .build());
    }
}
