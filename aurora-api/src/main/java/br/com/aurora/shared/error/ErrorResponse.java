package br.com.aurora.shared.error;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorResponse {
    private int status;
    private String erro;
    private List<String> mensagens;
    private String caminho;

    public static ErrorResponse of(int status, String erro, String mensagem, String caminho) {
        return ErrorResponse.builder()
                .status(status)
                .erro(erro)
                .mensagens(Collections.singletonList(mensagem))
                .caminho(caminho)
                .build();
    }

    public static ErrorResponse of(int status, String erro, List<String> mensagens, String caminho) {
        return ErrorResponse.builder()
                .status(status)
                .erro(erro)
                .mensagens(mensagens)
                .caminho(caminho)
                .build();
    }
}
