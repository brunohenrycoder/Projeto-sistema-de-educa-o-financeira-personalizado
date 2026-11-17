# SPEC — Metas Financeiras (FINANCIAL GOALS)

## 1. Objetivo

Especificar a geração de sugestões de metas de economia e a confirmação pelo usuário antes da criação de uma meta financeira.

## 2. Atores

- **Principal:** único perfil autorizado a acessar e administrar metas e sugestões financeiras familiares.
- **Dependente:** não possui acesso a metas ou sugestões financeiras familiares.

## 3. Requisitos funcionais

### GOAL-01 — Referência de sobra mensal

- O sistema deve calcular a sobra média dos três meses-calendário completos imediatamente anteriores ao mês atual.
- O cálculo deve considerar exclusivamente valores realizados.
- Se a sobra média for positiva, o sistema deve apresentá-la ao Principal somente como referência para planejamento.
- A sobra média não deve ser convertida automaticamente em valor-alvo da meta.
- Se a sobra média for igual ou inferior a zero, o sistema não deve apresentar uma sugestão automática baseada nesse cálculo.

### GOAL-02 — Decisão do usuário

- O Principal informa o valor-alvo que deseja estabelecer para a meta.
- O sistema valida o valor-alvo e solicita confirmação explícita do Principal.
- A meta somente deve ser criada após confirmação explícita do Principal.
- O sistema não pode criar metas automaticamente sem consentimento.

### GOAL-03 — Administração da meta

- O Principal pode consultar e acompanhar as metas criadas.
- O valor-alvo persistido deve ser exatamente o valor informado e confirmado pelo Principal.
- A administração das metas deve respeitar as permissões do perfil Principal.

## 4. Regras de negócio

- **RN-GOAL-01:** somente o Principal pode acessar e administrar metas financeiras familiares.
- **RN-GOAL-02:** a sugestão deve considerar a sobra média dos três meses-calendário completos imediatamente anteriores ao mês atual.
- **RN-GOAL-03:** a sobra mensal corresponde às receitas efetivamente recebidas menos as despesas efetivamente realizadas no respectivo mês.
- **RN-GOAL-04:** o cálculo deve utilizar exclusivamente valores realizados, conforme as regras de apuração do FINANCIAL OVERVIEW. Receitas futuras e despesas ainda não pagas não devem ser consideradas como valores realizados.
- **RN-GOAL-05:** os três meses de referência devem ser considerados consecutivamente, sem pular meses sem movimentação. Um mês sem receitas ou despesas realizadas deve ser considerado com sobra igual a zero.
- **RN-GOAL-06:** a sobra média corresponde à média aritmética das sobras mensais dos três meses de referência.
- **RN-GOAL-07:** se a sobra média for igual ou inferior a zero, o sistema não deve apresentar uma sugestão automática de meta baseada nesse cálculo.
- **RN-GOAL-08:** quando a sobra média for positiva, ela deve ser apresentada somente como informação de apoio ao planejamento.
- **RN-GOAL-09:** nenhuma meta pode ser criada sem confirmação explícita do Principal.
- **RN-GOAL-10:** o valor-alvo da meta deve ser informado pelo Principal e validado antes da confirmação.
- **RN-GOAL-11:** Dependentes não podem acessar metas ou sugestões financeiras familiares.
- **RN-GOAL-12:** a geração ou apresentação de uma sugestão não representa autorização para criar uma meta. A criação depende sempre da confirmação explícita do Principal.
- **RN-GOAL-13:** a sobra média nunca deve ser usada automaticamente como valor-alvo nem receber percentual ou multiplicador arbitrário.
- **RN-GOAL-14:** para o cálculo de sobra, despesas de cartão são consideradas pelo pagamento efetivo da fatura no mês do pagamento. Parcelas não devem ser somadas separadamente.

## 5. Fluxos principais

### 5.1. Referência de sobra e confirmação da meta

1. O sistema identifica os três meses-calendário completos imediatamente anteriores ao mês atual.
2. O sistema obtém as receitas recebidas e as saídas efetivamente pagas nesses meses, respeitando o fluxo de caixa realizado do FINANCIAL OVERVIEW.
3. O sistema calcula a sobra mensal de cada período.
4. O sistema calcula a média aritmética das três sobras mensais.
5. Se a média for igual ou inferior a zero, nenhuma referência automática de sobra deve ser apresentada.
6. Se a média for positiva, o sistema a apresenta ao Principal apenas como referência de planejamento.
7. O Principal informa o valor-alvo desejado.
8. O sistema valida o valor e solicita confirmação explícita.
9. Somente após a confirmação o sistema cria a meta com o valor informado.

### 5.2. Consulta e acompanhamento de metas

1. O Principal solicita a consulta de suas metas familiares.
2. O sistema valida a identidade e a permissão do usuário.
3. O sistema apresenta as metas criadas com os valores confirmados pelo Principal.

## 6. Critérios de aceitação

- [ ] A sugestão utiliza a sobra média dos três meses-calendário completos imediatamente anteriores.
- [ ] O cálculo considera somente receitas recebidas e saídas efetivamente pagas.
- [ ] Pagamentos de fatura são contabilizados no mês do pagamento e parcelas não são somadas separadamente à sobra.
- [ ] Meses sem movimentação não são ignorados e entram no cálculo com sobra igual a zero.
- [ ] A média é calculada considerando os três meses de referência.
- [ ] Se a sobra média for igual ou inferior a zero, nenhuma sugestão automática baseada nesse cálculo é apresentada.
- [ ] A sobra média positiva é apresentada somente como referência e nunca como valor-alvo automático.
- [ ] O Principal pode informar um valor-alvo próprio, que é validado antes da confirmação.
- [ ] Uma meta só é criada após confirmação explícita do Principal.
- [ ] A confirmação cria a meta com o valor-alvo informado pelo Principal.
- [ ] O Principal consegue consultar e acompanhar as metas criadas.
- [ ] Dependentes não conseguem acessar metas nem sugestões financeiras familiares.

## 7. Dependências e observações

- Os dados financeiros utilizados devem respeitar as regras de apuração do `financial-overview.md`.
- A sobra utilizada deve representar fluxo de caixa realizado, e não saldo projetado nem consumo por competência.
- Receitas são apuradas pela data de recebimento; despesas diretas, pagamentos de contas e pagamentos de faturas são apurados pela data efetiva do pagamento.
- Faturas pendentes não são saídas realizadas. Estornos somente afetam a sobra conforme seu efeito no fluxo de caixa, por exemplo, reduzindo pagamentos efetivamente realizados.
- A implementação não deve duplicar as regras de cálculo financeiro já existentes no FINANCIAL OVERVIEW.
- A arquitetura deve respeitar a organização VSA, sem chamadas diretas a services de outras slices. A reutilização deve ocorrer por componentes compartilhados de domínio quando apropriado.
- A sobra média é apenas informativa. Não existe conversão automática para valor-alvo; o Principal define e confirma o valor da meta.
- Consultar a referência de sobra não cria uma meta. A criação ocorre apenas pela operação explícita de confirmação.
- O escopo implementado permite consultar metas e seus valores confirmados; prazos e métricas de progresso não são definidos por esta especificação.

## 8. API implementada

- `GET /api/financial-goals/savings-suggestion` — retorna `averageMonthlySurplus` quando a média dos três meses anteriores for positiva; retorna `204 No Content` quando for igual ou inferior a zero.
- `POST /api/financial-goals/confirm` — confirma e cria uma meta com `targetAmount` informado pelo Principal. O valor deve ser positivo, ter no máximo duas casas decimais e até dez dígitos inteiros.
- `GET /api/financial-goals` — lista as metas e os valores confirmados do grupo familiar do Principal autenticado.
- As três operações são exclusivas do Principal. O grupo familiar é obtido a partir da identidade autenticada; a API não aceita `familyGroupId`.