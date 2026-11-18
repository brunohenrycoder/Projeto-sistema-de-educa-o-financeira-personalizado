# SPEC — Despesas (EXPENSES)

## 1. Objetivo

Especificar o registro e a consulta de despesas, respeitando o perfil do usuário e o isolamento entre integrantes da família.

## 2. Atores

- **Principal:** registra e consulta despesas do grupo familiar conforme as permissões do sistema.
- **Dependente:** registra, consulta, edita e exclui somente as despesas que ele próprio cadastrou.

## 3. Requisitos funcionais

### EXP-01 — Registrar despesa

O sistema deve permitir informar:

- valor positivo;
- data;
- categoria;
- método de pagamento.

O usuário responsável pelo lançamento deve ser identificado pelo servidor a partir da sessão autenticada, não por um valor livre enviado pelo cliente.

### EXP-02 — Consultar despesas

- O Principal pode consultar despesas do grupo familiar e aplicar filtros por período, categoria e integrante.
- O Dependente pode consultar somente as despesas que registrou.

### EXP-03 — Editar e excluir

- O Principal pode administrar as despesas dentro do escopo permitido ao seu perfil.
- O Dependente pode editar e excluir somente despesas registradas por ele.
- O backend deve verificar a autoria e o grupo familiar antes de permitir a operação.

### EXP-04 — Despesas no cartão

- Despesas pagas com cartão de crédito devem compor a fatura em aberto correspondente.
- O tratamento da fatura está detalhado em `credit-cards.md`.

## 4. Regras de negócio

- **RN-EXP-01:** o valor da despesa deve ser maior que zero.
- **RN-EXP-02:** data, categoria e método de pagamento são obrigatórios.
- **RN-EXP-03:** o registrante deve ser identificado no servidor.
- **RN-EXP-04:** toda despesa deve estar vinculada ao grupo familiar correto.
- **RN-EXP-05:** Dependentes só podem consultar, editar ou excluir despesas próprias.
- **RN-EXP-06:** despesas pagas com cartão de crédito integram a fatura em aberto.
- **RN-EXP-07:** o Dependente recebe apenas a confirmação do registro após salvar, sem acesso a totais ou análises familiares.

## 5. Fluxos principais

### Registro

1. O usuário autenticado abre o formulário de despesa.
2. Informa valor, data, categoria e método de pagamento.
3. O sistema valida os campos.
4. O backend identifica o usuário e o grupo familiar pela sessão.
5. O sistema registra a despesa.
6. Se o método for cartão de crédito, o valor é considerado na fatura em aberto.
7. O sistema apresenta confirmação do salvamento.

### Edição ou exclusão por Dependente

1. O Dependente seleciona uma despesa própria.
2. O backend verifica se o usuário autenticado é o registrante.
3. O backend verifica o grupo familiar.
4. A operação é executada somente se as verificações forem satisfeitas.

## 6. Critérios de aceitação

- [ ] O sistema exige valor positivo, data, categoria e método de pagamento.
- [ ] O registrante é obtido da sessão autenticada.
- [ ] O Principal consegue filtrar despesas por período, categoria e integrante.
- [ ] O Dependente vê somente despesas próprias.
- [ ] O Dependente consegue editar e excluir somente despesas próprias.
- [ ] Tentativas de acessar despesas de terceiros são recusadas no backend.
- [ ] Despesas no crédito são incluídas na fatura em aberto.
- [ ] O Dependente não recebe totais ou análises familiares.

## 7. Endpoints da API e contratos para o frontend

Todos os endpoints exigem autenticação JWT:

- `POST /api/expenses` — Registra uma nova despesa (gasto).
  - **Disponível para:** Principal e Dependente.
  - **Payload:**
    ```json
    {
      "amount": 42.50,
      "expenseDate": "2026-11-18",
      "category": "TRANSPORTE",
      "paymentMethod": "CARTAO_CREDITO",
      "description": "Corrida de Uber",
      "installmentCount": 1
    }
    ```
  - `amount` deve ser maior que zero; `expenseDate`, `category` e `paymentMethod` são obrigatórios.
  - O usuário responsável é atribuído automaticamente pelo backend a partir do token JWT. O payload não aceita identificador de usuário.
  - Se `paymentMethod` for `CARTAO_CREDITO`, `installmentCount` pode variar de 1 a 36 (padrão 1). O backend identifica o cartão ativo e associa a fatura aberta automaticamente; o cliente não informa identificadores de cartão ou fatura.
  - **Resposta (201 Created):** Retorna os dados da despesa cadastrada. Para o Dependente, retorna apenas a confirmação do lançamento, sem dados de saldo ou limite.

- `GET /api/expenses` — Lista despesas registradas.
  - **Filtros opcionais (Query):** `startDate` e `endDate` (formato `AAAA-MM-DD`), `category`, `memberId` (UUID).
  - **Comportamento por perfil:**
    - **Principal:** visualiza os lançamentos de todos os integrantes do grupo familiar. Pode filtrar por qualquer membro do grupo.
    - **Dependente:** visualiza **exclusivamente os próprios gastos** (RN-01, RN-02). Se informar `memberId` diferente do seu próprio ID, recebe HTTP 403 Forbidden.
    - **Resposta (200 OK):** Lista de itens de despesa `[{ "id": "uuid...", "familyGroupId": "...", "userId": "...", "userName": "...", "amount": 42.50, "expenseDate": "2026-11-18", "category": "TRANSPORTE", "paymentMethod": "CARTAO_CREDITO", "description": "Uber", ... }]`.
    - **Privacidade do Dependente:** O endpoint retorna estritamente a lista de despesas individuais, sem somatórios, totais agregados, médias ou saldos familiares.

- `PUT /api/expenses/{expenseId}` — Altera os dados de uma despesa.
  - **Payload:** `amount`, `expenseDate`, `category`, `paymentMethod`, `description`, `installmentCount`.
  - **Permissões:**
    - Principal pode alterar despesas do grupo familiar.
    - Dependente pode alterar **somente despesas que ele próprio cadastrou**. Tentativa de alterar gasto de outro membro retorna HTTP 403 Forbidden.
  - **Trava de faturas:** Despesas no cartão vinculadas a faturas fechadas, parcialmente pagas, pagas ou atrasadas não podem ser editadas diretamente (retorna HTTP 400). Apenas despesas vinculadas a faturas no estado `OPEN` podem ser alteradas.

- `DELETE /api/expenses/{expenseId}` — Exclusão lógica de uma despesa.
  - **Permissões:**
    - Principal pode excluir despesas do grupo familiar.
    - Dependente pode excluir **somente despesas cadastradas por ele**. Tentativa de excluir gasto de outro membro retorna HTTP 403 Forbidden.
  - **Comportamento:** A exclusão é lógica (altera status para `CANCELADO`), preservando o histórico, o autor e a data de exclusão.
  - **Trava de faturas:** Despesas no cartão vinculadas a faturas não abertas não podem ser canceladas diretamente. Em faturas abertas, o cancelamento abate as parcelas no ledger do cartão.
  - **Resposta (204 No Content).**
