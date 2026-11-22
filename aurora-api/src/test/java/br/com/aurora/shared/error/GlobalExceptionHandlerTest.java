package br.com.aurora.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private static final String CAMINHO = "/api/credit-cards/invoices/123";

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private HttpServletRequest request() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn(CAMINHO);
        return request;
    }

    @Test
    void typeMismatchOnPathVariableReturnsBadRequestWithSafeMessage() {
        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                "123", UUID.class, "invoiceId", null, new IllegalArgumentException("valor inválido")
        );

        ResponseEntity<ErrorResponse> resposta = handler.handleMethodArgumentTypeMismatch(ex, request());

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ErrorResponse corpo = resposta.getBody();
        assertThat(corpo).isNotNull();
        assertThat(corpo.getStatus()).isEqualTo(400);
        assertThat(corpo.getErro()).isEqualTo("Parâmetro inválido");
        assertThat(corpo.getMensagens()).containsExactly("Identificador informado é inválido.");
        assertThat(corpo.getCaminho()).isEqualTo(CAMINHO);
        assertThat(corpo.getMensagens().get(0)).doesNotContain("123", "UUID", "invoiceId");
    }

    @Test
    void illegalArgumentKeepsExistingBadRequestBehavior() {
        ResponseEntity<ErrorResponse> resposta = handler.handleIllegalArgumentException(
                new IllegalArgumentException("Mês inválido."), request()
        );

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(resposta.getBody()).isNotNull();
        assertThat(resposta.getBody().getErro()).isEqualTo("Parâmetro inválido");
        assertThat(resposta.getBody().getMensagens()).containsExactly("Mês inválido.");
        assertThat(resposta.getBody().getCaminho()).isEqualTo(CAMINHO);
    }

    @Test
    void resourceNotFoundKeepsExistingNotFoundBehavior() {
        ResponseEntity<ErrorResponse> resposta = handler.handleResourceNotFound(
                new ResourceNotFoundException("Fatura não encontrada no grupo familiar."), request()
        );

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(resposta.getBody()).isNotNull();
        assertThat(resposta.getBody().getStatus()).isEqualTo(404);
        assertThat(resposta.getBody().getErro()).isEqualTo("Não encontrado");
        assertThat(resposta.getBody().getMensagens())
                .containsExactly("Fatura não encontrada no grupo familiar.");
        assertThat(resposta.getBody().getCaminho()).isEqualTo(CAMINHO);
    }

    @Test
    void accessDeniedKeepsExistingForbiddenBehavior() {
        ResponseEntity<ErrorResponse> resposta = handler.handleAccessDenied(
                new AccessDeniedException("negado"), request()
        );

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(resposta.getBody()).isNotNull();
        assertThat(resposta.getBody().getMensagens())
                .containsExactly("Você não tem permissão para acessar este recurso.");
        assertThat(resposta.getBody().getCaminho()).isEqualTo(CAMINHO);
    }

    @Test
    void unexpectedExceptionKeepsExistingInternalServerErrorBehavior() {
        ResponseEntity<ErrorResponse> resposta = handler.handleGeneralException(
                new IllegalStateException("falha interna"), request()
        );

        assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(resposta.getBody()).isNotNull();
        assertThat(resposta.getBody().getStatus()).isEqualTo(500);
        assertThat(resposta.getBody().getErro()).isEqualTo("Erro interno");
        assertThat(resposta.getBody().getMensagens())
                .containsExactly("Ocorreu um erro interno inesperado no servidor. Tente novamente mais tarde.");
        assertThat(resposta.getBody().getCaminho()).isEqualTo(CAMINHO);
    }
}
