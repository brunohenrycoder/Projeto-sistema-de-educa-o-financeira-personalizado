package br.com.aurora.features.creditcards.getcreditcardinvoice;

import br.com.aurora.features.creditcards.CreditCardServiceTestSupport;
import br.com.aurora.shared.domain.Role;
import br.com.aurora.shared.domain.User;
import br.com.aurora.shared.security.UsuarioAutenticado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GetCreditCardInvoiceEndpointTest extends CreditCardServiceTestSupport {

    private static final String BASE = "/api/credit-cards/invoices";

    @Autowired private MockMvc mockMvc;

    @Test
    void invalidUuidPathVariableReturnsBadRequest() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "invoice-invalid-uuid@aurora.com", null);

        mockMvc.perform(get(BASE + "/123").with(user(UsuarioAutenticado.fromUser(principal))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.erro").value("Parâmetro inválido"))
                .andExpect(jsonPath("$.mensagens[0]").value("Identificador informado é inválido."))
                .andExpect(jsonPath("$.caminho").value(BASE + "/123"));
    }

    @Test
    void validButUnknownUuidStillReturnsNotFound() throws Exception {
        User principal = createUser(Role.PRINCIPAL, "invoice-unknown-uuid@aurora.com", null);
        UUID desconhecido = UUID.randomUUID();

        mockMvc.perform(get(BASE + "/" + desconhecido)
                        .with(user(UsuarioAutenticado.fromUser(principal))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.erro").value("Não encontrado"))
                .andExpect(jsonPath("$.mensagens[0]").value("Fatura não encontrada no grupo familiar."))
                .andExpect(jsonPath("$.caminho").value(BASE + "/" + desconhecido));
    }
}
