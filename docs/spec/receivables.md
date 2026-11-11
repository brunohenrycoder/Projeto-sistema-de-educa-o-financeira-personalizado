# SPEC — Contas a Receber (RECEIVABLES)

## 1. Objetivo
Especificar o cadastro e acompanhamento de valores que a família espera receber.

## 2. Ator
Somente o Principal pode acessar e administrar contas a receber.

## 3. Requisitos funcionais
### REC-01 — Cadastrar recebimento esperado
Campos obrigatórios:
- descrição ou origem do recebimento;
- valor positivo;
- data prevista;
- recorrência.

### REC-02 — Consultar recebimentos
- O Principal pode consultar os recebimentos e seus status.
- O sistema deve preservar o histórico.

### REC-03 — Registrar recebimento
- O Principal pode marcar um recebimento como recebido.
- O sistema deve registrar a data do recebimento.
- O sistema pode registrar o valor efetivamente recebido, quando informado.

### REC-04 — Recorrência
- O sistema deve suportar recebimentos recorrentes.
- O comportamento de geração de novas ocorrências deve respeitar a configuração de recorrência.

### REC-05 — Cancelamento
- O Principal pode cancelar um recebimento esperado.
- O cancelamento não deve apagar o registro.

## 4. Regras de negócio
- **RN-REC-01:** somente o Principal acessa contas a receber.
- **RN-REC-02:** o valor deve ser positivo.
- **RN-REC-03:** data e origem do recebimento devem ser registradas.
- **RN-REC-04:** recebimentos devem possuir status que represente sua situação.
- **RN-REC-05:** cancelar não equivale a excluir; o histórico deve ser preservado.
- **RN-REC-06:** recebimentos confirmados devem compor os valores recebidos nas visões financeiras.

## 5. Fluxos principais
### Cadastro
1. O Principal informa origem, valor, data prevista e recorrência.
2. O sistema valida os dados.
3. O sistema registra o recebimento esperado.

### Confirmação
1. O Principal seleciona o recebimento.
2. Informa a data em que recebeu.
3. Opcionalmente informa o valor efetivo.
4. O sistema atualiza o status e preserva o histórico.

## 6. Critérios de aceitação
- [ ] Apenas o Principal acessa o módulo.
- [ ] O cadastro exige origem, valor positivo e data.
- [ ] O sistema permite configurar recorrência.
- [ ] O Principal consegue marcar um recebimento como recebido.
- [ ] O histórico é preservado após cancelamento.
- [ ] Recebimentos confirmados são considerados nas visões financeiras.
