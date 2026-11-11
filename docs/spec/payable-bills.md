# SPEC — Contas a Pagar (PAYABLE BILLS)

## 1. Objetivo
Especificar o cadastro, acompanhamento, pagamento e recorrência de contas a pagar.

## 2. Ator
Somente o Principal pode acessar e administrar contas a pagar.

## 3. Requisitos funcionais
### PAY-01 — Cadastrar conta
Campos obrigatórios:
- descrição;
- valor positivo;
- data de vencimento;
- categoria;
- recorrência.

### PAY-02 — Consultar e acompanhar
- O Principal pode consultar contas e seus status.
- O sistema deve manter histórico das contas.
- O cancelamento não deve apagar o registro.

### PAY-03 — Registrar pagamento
- O Principal pode marcar uma conta como paga.
- Deve informar a data do pagamento e o método de pagamento.
- O método de pagamento é obrigatório no momento da quitação.
- O sistema pode registrar o valor efetivamente pago, quando informado.

### PAY-04 — Recorrência mensal
- Para uma conta com recorrência mensal, ao quitar a ocorrência atual o sistema deve criar a próxima ocorrência.
- A nova ocorrência deve manter os dados pertinentes da configuração recorrente.

### PAY-05 — Atraso
- Uma conta não paga após o vencimento deve passar automaticamente para o status `ATRASADA`.
- O sistema deve destacar contas atrasadas.

## 4. Regras de negócio
- **RN-PAY-01:** somente o Principal acessa contas a pagar.
- **RN-PAY-02:** o valor deve ser positivo.
- **RN-PAY-03:** o método de pagamento é obrigatório ao registrar a quitação.
- **RN-PAY-04:** conta vencida e não paga deve ser marcada como `ATRASADA`.
- **RN-PAY-05:** cancelar não equivale a excluir; o histórico deve ser preservado.
- **RN-PAY-06:** a quitação de uma ocorrência mensal gera a próxima ocorrência.
- **RN-PAY-07:** a conta deve manter seu histórico de alterações de status e pagamentos.

## 5. Fluxos principais
### Cadastro
1. O Principal informa os campos obrigatórios.
2. O sistema valida valor, vencimento, categoria e recorrência.
3. O sistema salva a conta com status inicial aplicável.

### Pagamento
1. O Principal seleciona uma conta.
2. Informa data e método de pagamento.
3. Opcionalmente informa o valor efetivamente pago.
4. O sistema registra a quitação e atualiza o status.
5. Se houver recorrência mensal, cria a próxima ocorrência.

### Atualização de atraso
1. O sistema verifica contas não pagas cujo vencimento já passou.
2. Atualiza o status para `ATRASADA`.
3. Mantém a conta visível no histórico e nos avisos pertinentes.

## 6. Critérios de aceitação
- [ ] Apenas o Principal acessa o módulo.
- [ ] O cadastro exige descrição, valor positivo, vencimento, categoria e recorrência.
- [ ] O método de pagamento é exigido na quitação.
- [ ] Contas vencidas e não pagas tornam-se `ATRASADA`.
- [ ] O cancelamento preserva o registro.
- [ ] A quitação de conta mensal cria a próxima ocorrência.
- [ ] O histórico de pagamentos e status é preservado.
