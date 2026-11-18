# SPEC — Contas a Receber (RECEIVABLES)

## 1. Objetivo

Especificar o cadastro, acompanhamento e confirmação de valores que a família espera receber, preservando o histórico financeiro e permitindo o controle de recebimentos recorrentes.

## 2. Ator

Somente o Principal pode acessar e administrar contas a receber.

O Dependente não poderá consultar, cadastrar, alterar, cancelar ou confirmar recebimentos.

## 3. Requisitos funcionais

### REC-01 — Cadastrar recebimento esperado

O sistema deverá permitir que o Principal cadastre um recebimento esperado.

Campos obrigatórios:

- Descrição ou origem do recebimento;
- Valor positivo;
- Data prevista;
- Recorrência.

O recebimento deverá ser associado ao grupo familiar do Principal autenticado.

Todo novo recebimento deverá ser criado com status `PENDENTE`.

### REC-02 — Consultar recebimentos

- O Principal poderá consultar os recebimentos cadastrados e seus respectivos status.
- O sistema deverá permitir a identificação dos recebimentos individuais e das ocorrências de uma mesma recorrência.
- O sistema deverá preservar o histórico dos recebimentos, inclusive após alterações, confirmações e cancelamentos.
- Recebimentos de outros grupos familiares não poderão ser consultados.

### REC-03 — Registrar recebimento

O sistema deverá permitir que o Principal confirme o recebimento de uma conta esperada.

O registro deverá considerar:

- Data efetiva do recebimento, obrigatória;
- Valor efetivamente recebido, opcional.

**Regras de recebimento:**

1. Caso o valor efetivamente recebido não seja informado, o sistema deverá considerar automaticamente o valor total esperado.
2. Caso seja informado, o valor deverá ser exatamente igual ao valor esperado.
3. Não serão permitidos recebimentos parciais nem valores superiores ao valor esperado.
4. Após a confirmação, o status deverá ser atualizado para `RECEBIDA`.
5. Um recebimento com status `RECEBIDA` não poderá ser confirmado novamente.
6. A data prevista deverá ser preservada, mesmo após o registro da data efetiva.
7. O registro deverá ocorrer de forma transacional, garantindo a consistência dos dados financeiros.

### REC-04 — Recorrência

O sistema deverá permitir que o Principal escolha uma das seguintes modalidades ao cadastrar um recebimento:

- `SEM_RECORRENCIA`: o recebimento será cadastrado como uma ocorrência única, sem geração automática de novos recebimentos.
- `MENSAL`: o sistema deverá gerar automaticamente novas ocorrências a cada mês, respeitando a configuração original da recorrência.

A recorrência deverá ser informada obrigatoriamente no cadastro.

Contas sem recorrência não deverão gerar ocorrências futuras.

O sistema deverá evitar a geração duplicada de ocorrências.

Na recorrência mensal, a próxima ocorrência será criada quando a ocorrência atual for confirmada. O cálculo preservará o dia original, usando o último dia disponível nos meses mais curtos e retomando o dia original nos meses seguintes.

### REC-05 — Cancelamento

O sistema deverá permitir que o Principal escolha o alcance do cancelamento de um recebimento recorrente:

- `SOMENTE_OCORRENCIA`: cancela exclusivamente a ocorrência selecionada, mantendo a recorrência e as demais ocorrências.
- `OCORRENCIA_E_FUTURAS`: cancela a ocorrência selecionada e todas as ocorrências futuras ainda não recebidas, encerrando a recorrência a partir daquela ocorrência.

**Regras de cancelamento:**

1. O cancelamento deverá atualizar o status dos recebimentos afetados para `CANCELADA`.
2. Recebimentos já confirmados não poderão ser cancelados.
3. Ocorrências anteriores à selecionada não deverão ser afetadas.
4. Ocorrências já canceladas deverão manter seu histórico.
5. O cancelamento não deverá excluir registros do banco de dados nem apagar informações financeiras anteriores.
6. Após o cancelamento da recorrência, o sistema não deverá gerar novas ocorrências.
7. O cancelamento deverá ocorrer de forma transacional.
8. Ao cancelar somente uma ocorrência mensal, a recorrência continuará ativa e a próxima ocorrência será criada para manter a série.

### REC-06 — Alterar recebimentos e recorrências

O sistema deverá permitir que o Principal altere os dados de um recebimento esperado.

**Regras de alteração:**

1. Alterações realizadas diretamente em uma ocorrência deverão afetar somente aquela ocorrência, sem modificar as demais.
2. Quando o Principal alterar a configuração de uma recorrência mensal, as alterações deverão ser aplicadas somente às ocorrências futuras ainda não recebidas ou canceladas.
3. Ocorrências já recebidas não poderão ser modificadas por alterações na recorrência.
4. Ocorrências canceladas deverão preservar seu histórico e não poderão ser reativadas automaticamente.
5. Ocorrências futuras já geradas deverão respeitar as mesmas regras de atualização.
6. Alterações na recorrência não deverão modificar registros financeiros já efetivados.

## 4. Regras de negócio

- **RN-REC-01:** somente o Principal poderá acessar e administrar contas a receber.
- **RN-REC-02:** o valor do recebimento deverá ser positivo.
- **RN-REC-03:** a descrição ou origem e a data prevista deverão ser registradas.
- **RN-REC-04:** todo recebimento deverá possuir um status que represente sua situação.
- **RN-REC-05:** cancelar não equivale a excluir; o histórico deverá ser preservado.
- **RN-REC-06:** somente recebimentos confirmados deverão compor os valores efetivamente recebidos nas visões financeiras.
- **RN-REC-07:** o recebimento deverá ser integral; pagamentos parciais não serão permitidos.
- **RN-REC-08:** o valor efetivamente recebido, quando informado, deverá ser igual ao valor esperado.
- **RN-REC-09:** recebimentos com data prevista ultrapassada e ainda não confirmados ou cancelados deverão ter seu status atualizado automaticamente para `ATRASADA`.
- **RN-REC-10:** o sistema deverá preservar separadamente a data prevista e a data efetiva do recebimento.
- **RN-REC-11:** todas as operações deverão respeitar o grupo familiar do Principal autenticado.
- **RN-REC-12:** ocorrências recebidas ou canceladas não deverão ser alteradas automaticamente por mudanças na configuração da recorrência.
- **RN-REC-13:** o sistema deverá evitar a geração duplicada de ocorrências recorrentes.
- **RN-REC-14:** um recebimento confirmado deverá compor as entradas realizadas da visão financeira pela data efetiva e pelo valor confirmado, sem criar um lançamento duplicado.

### Status dos recebimentos

Cada recebimento deverá possuir um dos seguintes status:

- `PENDENTE`: recebimento cadastrado, ainda não confirmado e dentro do prazo previsto.
- `RECEBIDA`: recebimento confirmado integralmente.
- `ATRASADA`: recebimento não confirmado cuja data prevista já foi ultrapassada.
- `CANCELADA`: recebimento esperado cancelado pelo Principal.

**Regras de atualização dos status:**

1. Todo recebimento deverá ser criado com status `PENDENTE`.
2. Quando a data prevista for ultrapassada e o recebimento ainda não estiver confirmado ou cancelado, o sistema deverá atualizar automaticamente seu status para `ATRASADA`.
3. Após a confirmação integral, o status deverá ser atualizado para `RECEBIDA`.
4. Recebimentos cancelados não deverão ser considerados pendentes, atrasados ou efetivamente recebidos.
5. Recebimentos confirmados não deverão voltar automaticamente para outros status.

### Transições permitidas

- `PENDENTE` → `RECEBIDA`
- `PENDENTE` → `ATRASADA`
- `PENDENTE` → `CANCELADA`
- `ATRASADA` → `PENDENTE` (quando a data prevista for corrigida para hoje ou uma data futura)
- `ATRASADA` → `RECEBIDA`
- `ATRASADA` → `CANCELADA`

## 5. Fluxos principais

### Cadastro

1. O Principal informa a descrição ou origem, o valor, a data prevista e a recorrência.
2. O sistema valida os dados informados.
3. O sistema registra o recebimento esperado com status `PENDENTE`.
4. Caso a recorrência seja mensal, o sistema deverá controlar a geração das próximas ocorrências conforme a configuração definida.

### Confirmação

1. O Principal seleciona um recebimento pendente ou atrasado.
2. Informa a data efetiva em que recebeu o valor.
3. Opcionalmente informa o valor efetivamente recebido.
4. O sistema valida se o valor informado corresponde integralmente ao valor esperado.
5. O sistema registra a confirmação e atualiza o status para `RECEBIDA`.
6. O recebimento passa a compor os valores efetivamente recebidos nas visões financeiras.

### Alteração

1. O Principal seleciona um recebimento ou sua configuração de recorrência.
2. O sistema identifica se a alteração será individual ou aplicada à recorrência.
3. Caso seja individual, somente a ocorrência selecionada será alterada.
4. Caso seja na recorrência, somente as ocorrências futuras não recebidas ou canceladas serão atualizadas.
5. O sistema preserva as ocorrências já recebidas e canceladas.

### Cancelamento

1. O Principal seleciona um recebimento.
2. O sistema permite escolher entre cancelar somente a ocorrência ou a ocorrência e as futuras.
3. O sistema identifica as ocorrências que poderão ser canceladas.
4. O sistema atualiza os status para `CANCELADA`, preservando os registros.
5. Caso o cancelamento encerre a recorrência, novas ocorrências deixam de ser geradas.

## 6. Critérios de aceitação

- [ ] Apenas o Principal consegue acessar e administrar contas a receber.
- [ ] O cadastro exige descrição ou origem, valor positivo, data prevista e recorrência.
- [ ] O sistema permite recorrência `SEM_RECORRENCIA` e `MENSAL`.
- [ ] O sistema evita a geração duplicada de ocorrências.
- [ ] O Principal consegue confirmar um recebimento.
- [ ] A data efetiva do recebimento é obrigatória na confirmação.
- [ ] O valor efetivo é opcional, mas, quando informado, deve corresponder integralmente ao valor esperado.
- [ ] O sistema rejeita recebimentos parciais ou superiores ao valor esperado.
- [ ] O sistema atualiza automaticamente recebimentos vencidos para `ATRASADA`.
- [ ] O sistema preserva separadamente a data prevista e a data efetiva.
- [ ] Alterações individuais afetam somente a ocorrência selecionada.
- [ ] Alterações na recorrência afetam somente ocorrências futuras não recebidas ou canceladas.
- [ ] O Principal consegue cancelar somente uma ocorrência ou a ocorrência e as futuras.
- [ ] Recebimentos confirmados não podem ser cancelados.
- [ ] O histórico é preservado após alterações, confirmações e cancelamentos.
- [ ] Recebimentos confirmados são considerados nas visões financeiras sem duplicidade.
- [ ] O sistema impede acesso a recebimentos de outros grupos familiares.

## 7. API implementada e contratos para o frontend

Os endpoints aceitam os prefixos `/api/receivables` e `/receivables`, exigem autenticação JWT e perfil Principal. As operações filtram automaticamente pelo grupo familiar autenticado:

- `POST /api/receivables` — Cadastra um novo recebimento esperado.
  - **Payload:**
    ```json
    {
      "description": "Salário",
      "expectedAmount": 5000.00,
      "expectedDate": "2026-11-05",
      "recurrence": "MENSAL"
    }
    ```
  - Recorrências permitidas: `SEM_RECORRENCIA` (ocorrência única) e `MENSAL`.
  - **Resposta (201 Created):** Retorna o recebimento criado com `id`, `seriesId`, `description`, `expectedAmount`, `expectedDate`, `recurrence`, `status` (`PENDENTE` ou `ATRASADA`), `occurrenceNumber`.

- `GET /api/receivables` — Lista todos os recebimentos do grupo familiar.
  - **Resposta (200 OK):** Lista de recebimentos com status e datas. Se a data prevista estiver no passado e o recebimento continuar pendente, é retornado com status `ATRASADA`.

- `PUT /api/receivables/{receivableId}` — Atualiza os dados de uma ocorrência individual pendente ou atrasada.
  - **Payload:**
    ```json
    {
      "description": "Salário com bônus",
      "expectedAmount": 5500.00,
      "expectedDate": "2026-11-06"
    }
    ```
  - **Escopo:** Altera exclusivamente a ocorrência indicada.

- `PUT /api/receivables/{receivableId}/recurrence` — Atualiza a configuração da recorrência mensal e ocorrências futuras elegíveis.
  - **Payload:**
    ```json
    {
      "description": "Salário Atualizado",
      "expectedAmount": 5500.00,
      "nextExpectedDate": "2026-12-05",
      "recurrenceDay": 5
    }
    ```
  - **Escopo:** Atualiza os parâmetros da série mensal e propaga para ocorrências futuras em aberto (não recebidas e não canceladas). Ocorrências já recebidas ou canceladas não são alteradas.

- `POST /api/receivables/{receivableId}/cancel` — Cancela o recebimento conforme o escopo informado.
  - **Payload:**
    ```json
    {
      "scope": "SOMENTE_OCORRENCIA"
    }
    ```
    ou `"scope": "OCORRENCIA_E_FUTURAS"`.
  - **Escopos:**
    - `SOMENTE_OCORRENCIA`: Cancela apenas a ocorrência indicada (status `CANCELADA`). A série mensal continua ativa e a próxima ocorrência é gerada para dar continuidade à série.
    - `OCORRENCIA_E_FUTURAS`: Cancela a ocorrência indicada e todas as futuras ainda não confirmadas, encerrando a série mensal (nenhuma nova ocorrência será criada).
  - Recebimentos com status `RECEBIDA` não podem ser cancelados.

- `POST /api/receivables/{receivableId}/confirm` — Confirma o recebimento integral do valor.
  - **Payload:**
    ```json
    {
      "receivedDate": "2026-11-05",
      "receivedAmount": 5000.00
    }
    ```
  - `receivedDate` é obrigatório.
  - `receivedAmount` é opcional; se informado, deve corresponder exatamente ao valor esperado. Não são permitidos recebimentos parciais ou superiores.
  - Atualiza o status para `RECEBIDA`.
  - Se a recorrência for `MENSAL`, gera automaticamente a próxima ocorrência da série.

- `GET /api/receivables/{receivableId}/history` — Consulta o histórico de alterações de status e confirmação do recebimento.

## 8. Integração financeira

O registro de confirmação e sua data/valor são a fonte das entradas realizadas na visão financeira: o valor confirmado é contabilizado pela data efetiva do recebimento. Recebimentos pendentes ou atrasados são considerados entradas previstas pela data esperada; cancelados não entram no cálculo. A confirmação não cria um segundo lançamento financeiro.
