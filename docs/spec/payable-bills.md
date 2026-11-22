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

Categorias permitidas: `MORADIA`, `ALIMENTACAO`, `TRANSPORTE`, `SAUDE`,
`EDUCACAO`, `LAZER`, `CONTAS_CONSUMO`, `ASSINATURAS`, `IMPOSTOS` e
`OUTROS`. A API rejeita valores fora dessa lista.

Recorrências permitidas: `SEM_RECORRENCIA` e `MENSAL`. A recorrência é
obrigatória no cadastro. `SEM_RECORRENCIA` cria uma única ocorrência;
`MENSAL` cria a ocorrência seguinte quando a atual é quitada.

### PAY-02 — Consultar e acompanhar
- O Principal pode consultar contas e seus status.
- O sistema deve manter histórico das contas.
- O cancelamento não deve apagar o registro.

### PAY-03 — Registrar pagamento e integração financeira
- O Principal pode marcar uma conta como paga.
- Deve informar a data do pagamento e o método de pagamento.
- O método de pagamento é obrigatório no momento da quitação (`DINHEIRO`, `PIX`, `DEBITO`, `CARTAO_CREDITO`, etc.).
- O valor efetivamente pago é opcional; quando informado, deve ser exatamente igual ao valor integral da conta. Pagamentos parciais não são permitidos em contas a pagar.
- Uma conta quitada gera exatamente uma despesa correspondente em `EXPENSES` na mesma transação.
- **Integração com CREDIT CARDS:** Quando o método for `CARTAO_CREDITO`, a despesa gerada é registrada como uma compra à vista (1 parcela) no cartão de crédito ativo por meio do `CreditCardLedger`, passando a integrar a fatura aberta do cartão.
- **Fluxo de Caixa (FINANCIAL OVERVIEW):**
  - Quitações com métodos à vista/diretos (`DINHEIRO`, `PIX`, `DEBITO`, etc.) são contabilizadas imediatamente como saídas realizadas na data do pagamento.
  - Quitações com `CARTAO_CREDITO` não geram saída imediata no fluxo de caixa no momento da baixa da conta; a saída efetiva de caixa ocorrerá somente quando a fatura do cartão for paga em `CREDIT CARDS`.
  - A quitação posterior da fatura não gera nova conta a pagar nem duplica a despesa de consumo.

### PAY-04 — Recorrência mensal
- Para uma conta com recorrência mensal, ao quitar a ocorrência atual o sistema deve criar a próxima ocorrência.
- A nova ocorrência deve manter os dados pertinentes da configuração recorrente.
- A próxima data de vencimento é calculada a partir da ocorrência quitada,
  avançando um mês e preservando o dia configurado. Em meses sem esse dia,
  usa-se o último dia do mês; nos meses seguintes, retoma-se o dia original
  (por exemplo, 31/jan → 28/fev → 31/mar).
- A criação da ocorrência seguinte é idempotente; não pode haver duas
  ocorrências com o mesmo número na série.
- Só uma ocorrência futura é criada por quitação. Se a ocorrência mensal
  for cancelada individualmente antes da criação da seguinte, a série
  permanece ativa e a próxima ocorrência é mantida/gerada.

### PAY-06 — Atualizar conta e recorrência
- Atualizar uma ocorrência altera somente aquela conta.
- A alteração da configuração de uma série mensal afeta somente
  ocorrências futuras não pagas nem canceladas; ocorrências pagas ou
  canceladas preservam os dados e o histórico.
- Atualizar a configuração mensal permite alterar descrição, valor,
  categoria e próximo vencimento. A série permanece mensal.

### PAY-07 — Cancelar conta
- O Principal escolhe entre `SOMENTE_OCORRENCIA` e
  `OCORRENCIA_E_FUTURAS`.
- `SOMENTE_OCORRENCIA` cancela apenas a ocorrência selecionada e mantém
  a série ativa.
- `OCORRENCIA_E_FUTURAS` cancela a ocorrência selecionada e as futuras
  ainda não pagas, encerrando a série.
- Contas pagas não podem ser canceladas. Contas já canceladas mantêm o
  histórico e não são reativadas.

### PAY-08 — Estados da conta
- Os estados são `PENDENTE`, `PAGA`, `ATRASADA` e `CANCELADA`.
- Uma conta com vencimento anterior à data atual é criada como
  `ATRASADA`; as demais são criadas como `PENDENTE`.
- O histórico de mudanças de estado e os pagamentos são preservados.

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
- **RN-PAY-08:** as categorias aceitas são somente as dez opções definidas em PAY-01.
- **RN-PAY-09:** a quitação é integral; o valor informado, quando presente, deve ser igual ao valor da conta.
- **RN-PAY-10:** os estados válidos são `PENDENTE`, `PAGA`, `ATRASADA` e `CANCELADA`.
- **RN-PAY-11:** uma despesa é criada na mesma transação da quitação; o vínculo único entre conta paga e despesa impede duplicidade.

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
4. A listagem apresenta `ATRASADA` imediatamente quando o vencimento já passou,
   mesmo antes da persistência pela rotina automática.
5. A rotina automática é executada diariamente e só seleciona contas `PENDENTE`.

## 6. Endpoints da API e contratos para o frontend

Todos os endpoints exigem autenticação JWT e perfil Principal. As consultas filtram automaticamente pelo grupo familiar autenticado.

- `POST /api/payable-bills` — Cadastra uma nova conta a pagar.
  - **Payload:**
    ```json
    {
      "description": "Aluguel",
      "amount": 1500.00,
      "dueDate": "2026-11-20",
      "category": "MORADIA",
      "recurrence": "MENSAL"
    }
    ```
  - Categorias válidas: `MORADIA`, `ALIMENTACAO`, `TRANSPORTE`, `SAUDE`, `EDUCACAO`, `LAZER`, `CONTAS_CONSUMO`, `ASSINATURAS`, `IMPOSTOS`, `OUTROS`.
  - Recorrências válidas: `SEM_RECORRENCIA`, `MENSAL`.
  - **Resposta (201 Created):** Retorna a conta criada com `id`, `seriesId`, `description`, `amount`, `dueDate`, `category`, `recurrence`, `status` (`PENDENTE` ou `ATRASADA`), `occurrenceNumber`.

- `GET /api/payable-bills` — Lista as contas a pagar do grupo familiar.
  - **Resposta (200 OK):** Lista de contas ordenadas por data de vencimento. As contas vencidas que ainda estão como `PENDENTE` no banco são exibidas virtualmente como `ATRASADA` na consulta.

- `PUT /api/payable-bills/{billId}` — Atualiza os dados de uma ocorrência individual não paga e não cancelada.
  - **Payload:** `description`, `amount`, `dueDate`, `category`.
  - **Escopo:** Altera exclusivamente a ocorrência indicada.

- `PUT /api/payable-bills/{billId}/recurrence` — Atualiza a configuração da série mensal recorrente.
  - **Payload:** `description`, `amount`, `category`, `nextDueDate`.
  - **Escopo:** Atualiza os parâmetros da série e propaga as alterações para todas as ocorrências futuras elegíveis (ainda não pagas e não canceladas). Ocorrências já quitadas ou canceladas não são modificadas.

- `POST /api/payable-bills/{billId}/cancel` — Cancela conta(s) a pagar conforme o escopo.
  - **Payload:**
    ```json
    {
      "scope": "SOMENTE_OCORRENCIA"
    }
    ```
    ou `"scope": "OCORRENCIA_E_FUTURAS"`.
  - **Escopos:**
    - `SOMENTE_OCORRENCIA`: Cancela apenas a ocorrência indicada (status `CANCELADA`), mantendo a série ativa. Para assegurar a continuidade da série mensal, a próxima ocorrência é gerada.
    - `OCORRENCIA_E_FUTURAS`: Cancela a ocorrência selecionada e todas as futuras ainda não quitadas, encerrando a série mensal (novas ocorrências não serão geradas).
  - Contas já pagas não podem ser canceladas.

- `POST /api/payable-bills/{billId}/payments` — Registra a quitação integral da conta.
  - **Payload:**
    ```json
    {
      "paymentDate": "2026-11-18",
      "paymentMethod": "PIX",
      "amount": 1500.00
    }
    ```
  - `paymentDate` e `paymentMethod` são obrigatórios.
  - `amount` é opcional; se enviado, deve corresponder exatamente ao valor total da conta. Pagamentos parciais são rejeitados (400 Bad Request).
  - Gera automaticamente uma despesa em `EXPENSES` e vincula o pagamento. Se o método for `CARTAO_CREDITO`, registra no `CreditCardLedger` (1 parcela na fatura aberta).
  - Se a conta for de recorrência `MENSAL`, gera automaticamente a próxima ocorrência mensal.

- `GET /api/payable-bills/{billId}/payments` — Consulta o histórico de pagamentos da conta.

## 7. Critérios de aceitação
- [ ] Apenas o Principal acessa o módulo.
- [ ] O cadastro exige descrição, valor positivo, vencimento, categoria e recorrência.
- [ ] Categorias e recorrências fora das listas permitidas são rejeitadas.
- [ ] O método de pagamento é exigido na quitação.
- [ ] A quitação integral cria exatamente uma despesa correspondente.
- [ ] Contas vencidas e não pagas tornam-se `ATRASADA`.
- [ ] O cancelamento preserva o registro.
- [ ] A quitação de conta mensal cria a próxima ocorrência.
- [ ] O histórico de pagamentos e status é preservado.
