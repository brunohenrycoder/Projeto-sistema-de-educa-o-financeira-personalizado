# SPEC — Metas Financeiras (FINANCIAL GOALS)

## 1. Objetivo
Especificar a geração de sugestões de metas de economia e a confirmação pelo usuário antes da criação de uma meta.

## 2. Ator
Somente o Principal pode acessar e administrar metas financeiras familiares.

## 3. Requisitos funcionais
### GOAL-01 — Sugestão automática
- O sistema deve poder sugerir uma meta de economia com base na sobra média dos últimos três meses.
- A sugestão deve ser apresentada ao Principal para avaliação.

### GOAL-02 — Decisão do usuário
- O Principal pode aceitar, ajustar ou recusar a sugestão.
- A meta somente deve ser criada após confirmação explícita.
- O sistema não pode criar metas automaticamente sem consentimento.

### GOAL-03 — Administração da meta
- O Principal deve poder consultar e acompanhar as metas criadas.
- Os dados da meta devem refletir os valores confirmados pelo usuário.

## 4. Regras de negócio
- **RN-GOAL-01:** somente o Principal acessa metas financeiras familiares.
- **RN-GOAL-02:** a sugestão considera a sobra média dos últimos três meses.
- **RN-GOAL-03:** o Principal pode aceitar, ajustar ou recusar uma sugestão.
- **RN-GOAL-04:** nenhuma meta é criada sem confirmação explícita do Principal.
- **RN-GOAL-05:** recusar uma sugestão não deve criar uma meta.
- **RN-GOAL-06:** Dependentes não acessam metas ou sugestões financeiras familiares.

## 5. Fluxos principais
### Geração e confirmação
1. O sistema calcula a sobra média dos últimos três meses.
2. O sistema apresenta uma sugestão de meta ao Principal.
3. O Principal escolhe aceitar, ajustar ou recusar.
4. Se aceitar, o sistema cria a meta com os dados sugeridos.
5. Se ajustar, o sistema solicita os valores desejados e cria a meta após confirmação.
6. Se recusar, o sistema registra a decisão sem criar meta.

## 6. Critérios de aceitação
- [ ] A sugestão utiliza a sobra média dos últimos três meses.
- [ ] O Principal consegue aceitar, ajustar ou recusar.
- [ ] Uma meta só é criada após confirmação explícita.
- [ ] Recusar uma sugestão não cria uma meta.
- [ ] Dependentes não acessam metas nem sugestões familiares.

## 7. Dependências e observações
- Os dados financeiros utilizados devem respeitar as regras de `financial-overview.md`.
- A fórmula detalhada para converter a sobra média em valor-alvo da meta não está especificada como regra fechada; não deve ser inventada durante a implementação sem uma decisão de produto.
