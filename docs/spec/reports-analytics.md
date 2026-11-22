# SPEC — Relatórios e Análises (REPORTS & ANALYTICS)

## 1. Objetivo

Permitir que o Principal visualize relatórios e padrões de consumo da família para compreender a distribuição das despesas, identificar categorias com maiores gastos e acompanhar suas variações ao longo do tempo.

## 2. Ator

- **Principal:** único perfil autorizado a acessar relatórios e análises financeiras familiares.
- **Dependente:** não possui acesso aos relatórios nem às análises financeiras familiares.

## 3. Requisitos funcionais

### REP-01 — Relatório de despesas

- O sistema deve apresentar despesas agrupadas por categoria.
- O sistema deve apresentar despesas agrupadas por integrante.
- O Principal deve poder filtrar os dados por período e demais filtros previstos na consulta de despesas.
- Os relatórios devem considerar os registros pertencentes ao grupo familiar.
- Os valores apresentados devem respeitar as regras de consumo estabelecidas nas funcionalidades de origem.

### REP-02 — Identificação de padrões

- O sistema deve identificar as três categorias com maiores despesas no período analisado.
- Deve comparar os valores do período atual com a média dos meses anteriores.
- A comparação deve utilizar no máximo os três meses anteriores.
- A análise deve estar disponível quando houver pelo menos dois meses de histórico.
- Quando houver dois meses disponíveis, deve utilizar a média desses dois meses.
- Quando houver três ou mais meses disponíveis, deve utilizar a média dos três meses imediatamente anteriores.
- Categorias empatadas na última posição do ranking devem ser apresentadas, mesmo que isso resulte em mais de três categorias.

### REP-03 — Variação de categoria (dados quantitativos de apoio ao RF-017)

- O sistema deve identificar aumento superior a 20% em uma categoria em relação à média histórica utilizada.
- O percentual de variação deve ser calculado com base no valor do período atual e na média histórica.
- Quando a média histórica for igual a zero, o sistema não deve realizar divisão por zero nem gerar variação percentual (retorna nulo).
- A identificação da variação disponibiliza dados numéricos para análise de consumo.
- A API não gera recomendações ou textos de sugestão personalizada; o escopo limita-se ao fornecimento dos dados quantitativos de variação.
- A geração de recomendações textuais personalizadas (RF-017) permanece sem contrato funcional definido no backend e não deve ser simulada pelo frontend.

## 4. Regras de negócio

- **RN-REP-01:** relatórios e análises familiares são exclusivos do Principal.

- **RN-REP-02:** relatórios devem considerar os registros pertencentes ao grupo familiar.

- **RN-REP-03:** relatórios por categoria devem agrupar os valores conforme as categorias registradas nas funcionalidades de origem.

- **RN-REP-04:** relatórios por integrante devem agrupar as despesas conforme o usuário responsável pelo registro.

- **RN-REP-05:** a análise de padrões deve apresentar as três categorias de maior despesa, incluindo eventuais empates na última posição.

- **RN-REP-06:** a comparação histórica utiliza a média de no máximo três meses anteriores ao período analisado.

- **RN-REP-07:** quando houver apenas dois meses de histórico disponíveis, a média deve considerar esses dois meses.

- **RN-REP-08:** quando houver três ou mais meses de histórico disponíveis, a média deve considerar os três meses imediatamente anteriores ao período analisado.

- **RN-REP-09:** a análise de padrões exige pelo menos dois meses de histórico.

- **RN-REP-10:** aumento superior a 20% em uma categoria deve ser identificado como variação relevante e disponibilizado para possível utilização em sugestões financeiras.

- **RN-REP-11:** a variação percentual deve ser calculada pela diferença entre o valor atual e a média histórica, dividida pela média histórica e multiplicada por 100.

- **RN-REP-12:** quando a média histórica de uma categoria for igual a zero, não deve ser calculada variação percentual.

- **RN-REP-13:** a funcionalidade deve respeitar as regras de consumo das funcionalidades de origem, evitando duplicidade entre despesas, compras no cartão e pagamentos de faturas.

- **RN-REP-14:** compras no cartão devem ser consideradas conforme as regras de competência e consumo estabelecidas na SPEC de `CREDIT CARDS` e `FINANCIAL OVERVIEW`.

- **RN-REP-15:** pagamentos de faturas não devem ser contabilizados novamente como consumo, pois representam a quitação de despesas já registradas.

- **RN-REP-16:** despesas canceladas e estornos devem respeitar as regras definidas nas funcionalidades de origem.

- **RN-REP-17:** a identificação de variações é responsabilidade de `REPORTS-ANALYTICS`; a criação e o gerenciamento de sugestões são responsabilidades de `FINANCIAL GOALS`.

- **RN-REP-18:** Dependentes não podem acessar relatórios nem análises financeiras familiares, inclusive por chamadas diretas à API.

- **RN-REP-19:** os cálculos monetários devem utilizar precisão decimal adequada, evitando erros de arredondamento.

## 5. Definições complementares

### 5.1. Consideração das despesas

Os relatórios devem utilizar os dados das funcionalidades de origem, respeitando suas regras de negócio.

- Despesas comuns devem ser consideradas conforme sua data, valor e situação.
- Compras no cartão devem seguir as regras de competência definidas nas SPECs correspondentes.
- Parcelamentos devem respeitar a distribuição dos valores nos períodos aplicáveis, conforme as regras financeiras do projeto.
- Pagamentos de faturas não devem ser somados novamente como despesas de consumo.
- Despesas canceladas devem ser excluídas conforme suas regras de origem.
- Estornos devem reduzir os valores considerados conforme as regras definidas nas funcionalidades responsáveis.

Não devem ser criados registros financeiros duplicados para alimentar relatórios.

### 5.2. Comparação histórica

A média histórica deve considerar os meses imediatamente anteriores ao período analisado, sem incluir o próprio período atual.

Exemplo para análise de novembro:

- Se houver histórico de outubro e setembro, utilizar a média desses dois meses.
- Se houver histórico de outubro, setembro e agosto, utilizar a média desses três meses.
- Se houver mais de três meses disponíveis, utilizar somente os três meses imediatamente anteriores.
- Se houver menos de dois meses disponíveis, não apresentar análise de padrões.

A ausência de registros em uma categoria nos meses anteriores deve ser tratada como valor zero para aquela categoria, desde que o mês esteja dentro do histórico disponível.

Um mês de histórico é considerado disponível quando existe ao menos uma despesa `ATIVO` de qualquer integrante do grupo familiar registrada naquele mês. Despesas `CANCELADO` não tornam um mês disponível. Meses sem despesas ativas não contam, e os meses disponíveis não precisam ser consecutivos. A seleção exclui o mês analisado e utiliza os três meses disponíveis mais recentes. Por exemplo, para analisar novembro, se houver despesas ativas em outubro, agosto e julho, mas não em setembro, o histórico será outubro, agosto e julho.

### 5.3. Cálculo da variação percentual

A variação percentual deve ser calculada pela seguinte fórmula:

`Variação (%) = ((Valor atual - Média histórica) / Média histórica) × 100`

Exemplo:

- Média histórica: R$ 500,00.
- Valor atual: R$ 650,00.
- Variação: 30%.

Nesse caso, a categoria apresenta aumento superior a 20%.

Quando a média histórica for igual a zero, o sistema não deve calcular percentual nem classificar a categoria como aumento superior a 20%.

### 5.4. Relação com sugestões personalizadas (RF-017) e FINANCIAL GOALS

- `REPORTS-ANALYTICS` identifica categorias com aumento superior a 20% em relação à média histórica e disponibiliza exclusivamente os dados estruturados da análise (valor atual, média histórica, percentual de variação).
- Não há geração automática de recomendações textuais personalizadas na API. A análise quantitativa de variação de categorias não equivale a sugestões textuais personalizadas (RF-017).
- A geração de recomendações personalizadas permanece sem contrato funcional definido no backend e não deve ser simulada nem criada pelo frontend.
- `FINANCIAL GOALS` limita-se à sugestão de meta de economia baseada na sobra média mensal realizada (fluxo de caixa), sem gerar recomendações a partir de categorias.
- A interface do frontend deve representar fielmente os dados numéricos fornecidos pela API, sem introduzir conselhos financeiros inventados.

## 6. Fluxos principais

### 6.1. Relatório por categoria ou integrante

1. O Principal seleciona o tipo de relatório.
2. Informa o período e os filtros desejados.
3. O sistema valida as permissões do usuário autenticado.
4. O sistema reúne as despesas do grupo familiar.
5. Aplica os filtros solicitados.
6. Agrupa os valores por categoria ou integrante.
7. Apresenta os resultados ao Principal.

### 6.2. Análise de padrões

1. O sistema verifica a existência de histórico suficiente.
2. Se houver menos de dois meses de histórico, não apresenta a análise.
3. Se houver dois meses, utiliza a média desses dois meses.
4. Se houver três ou mais meses, utiliza a média dos três meses imediatamente anteriores.
5. Calcula os valores de despesas por categoria.
6. Identifica as três categorias de maior despesa, preservando os empates na última posição.
7. Compara os valores atuais com as respectivas médias históricas.
8. Identifica aumentos superiores a 20%.
9. Disponibiliza os resultados da análise ao Principal.

### 6.3. Disponibilização de variações para sugestões

1. `REPORTS-ANALYTICS` identifica uma categoria com aumento superior a 20%.
2. Disponibiliza os dados da variação para utilização pela funcionalidade `FINANCIAL GOALS`.
3. `FINANCIAL GOALS` decide como utilizar a informação conforme suas próprias regras.
4. `REPORTS-ANALYTICS` não cria nem gerencia sugestões financeiras.

## 7. Critérios de aceitação

- [ ] O Principal consulta despesas por categoria.
- [ ] O Principal consulta despesas por integrante.
- [ ] Os filtros de período são aplicados corretamente.
- [ ] Os relatórios consideram somente registros do grupo familiar.
- [ ] O sistema identifica as três categorias de maior despesa.
- [ ] Categorias empatadas na última posição são apresentadas.
- [ ] A comparação utiliza a média dos meses anteriores, limitada aos três meses imediatamente anteriores.
- [ ] Com dois meses de histórico, a média considera os dois meses.
- [ ] Com três ou mais meses, a média considera os três meses imediatamente anteriores.
- [ ] A análise não é apresentada quando houver menos de dois meses de histórico.
- [ ] O sistema identifica aumentos superiores a 20%.
- [ ] Não ocorre divisão por zero quando a média histórica é igual a zero.
- [ ] As compras no cartão respeitam as regras de competência e consumo.
- [ ] Pagamentos de faturas não são contabilizados novamente como consumo.
- [ ] Cancelamentos e estornos respeitam as regras das funcionalidades de origem.
- [ ] A identificação de variações não cria sugestões diretamente.
- [ ] Dependentes não conseguem acessar relatórios ou análises familiares, inclusive diretamente pela API.

## 8. Observações de implementação e integração com o frontend

- A implementação do backend segue a arquitetura VSA e as decisões documentadas nos ADRs.
- O módulo terá interface no frontend React, além da implementação já concluída e funcional no backend.
- A interface no frontend React deve representar com precisão os dados efetivamente fornecidos pela API, sem inventar novos indicadores, cálculos, recomendações ou regras de análise.
- O acesso aos relatórios e análises no frontend e no backend é restrito ao Principal (RN-01, RN-04, RN-REP-01, RN-REP-18). O Dependente não acessa esta tela nem os endpoints.
- A funcionalidade reutiliza os dados de consumo apurados a partir de `EXPENSES`, `CREDIT CARDS` e `FINANCIAL OVERVIEW`.
- Não devem ser duplicados cálculos ou regras financeiras já existentes.
- Os cálculos monetários utilizam `BigDecimal` no backend e valores decimais formatados na interface.
- A autorização é validada no backend em todas as requisições.
- As consultas respeitam o isolamento por grupo familiar do usuário autenticado.
- Não implementar geração de recomendações textuais nesta feature; a entrega restringe-se aos dados analíticos de consumo e variações.
- Não alterar regras de negócio das funcionalidades de origem para atender aos relatórios.

## 9. Endpoints da API e contratos para o frontend

Todas as rotas abaixo são exclusivas do Principal e obtêm o grupo familiar da autenticação JWT. Identificadores enviados como filtro não concedem acesso a outros grupos.

- `GET /api/reports-analytics/expenses/by-category` — agrupa o consumo por categoria.
  - **Parâmetros opcionais (Query):** `startDate` e `endDate` no formato `AAAA-MM-DD`, `category` (até 50 caracteres) e `memberId` (UUID). Quando as duas datas forem informadas, `startDate` não pode ser posterior a `endDate`.
  - **Resposta (200 OK):** Lista de objetos `[{ "category": "ALIMENTACAO", "totalAmount": 450.00 }, ...]`.
  - **Estado vazio:** Quando não houver despesas no período/filtros, retorna lista vazia `[]`.

- `GET /api/reports-analytics/expenses/by-member` — agrupa o consumo por integrante.
  - **Parâmetros opcionais (Query):** Mesmos filtros da consulta por categoria (`startDate`, `endDate`, `category`, `memberId`).
  - **Resposta (200 OK):** Lista de objetos `[{ "memberId": "uuid...", "memberName": "João", "totalAmount": 320.00 }, ...]`.
  - **Estado vazio:** Quando não houver despesas no período/filtros, retorna lista vazia `[]`.

- `GET /api/reports-analytics/patterns?month=AAAA-MM` — apresenta as três maiores categorias, preservando empates na última posição, a média histórica e a variação percentual.
  - **Parâmetros (Query):** `month` (obrigatório, formato `AAAA-MM`); filtros opcionais: `category` e `memberId`.
  - **Resposta (200 OK):**
    ```json
    {
      "period": "2026-11",
      "analysisAvailable": true,
      "historyMonthsUsed": 3,
      "topCategories": [
        {
          "category": "ALIMENTACAO",
          "currentAmount": 1200.00,
          "historicalAverage": 1000.00,
          "variationPercent": 20.00
        }
      ]
    }
    ```
  - **Estado de histórico insuficiente:** Quando houver menos de dois meses de histórico disponíveis (0 ou 1 mês), a API retorna `200 OK` com `"analysisAvailable": false`, `"historyMonthsUsed": <n>` e `"topCategories": []`. O frontend deve exibir mensagem orientando que são necessários pelo menos 2 meses de histórico para identificar padrões.
  - **Tratamento de média zero:** Quando a média histórica de uma categoria for zero, `variationPercent` retorna `null` (evitando divisão por zero).

- `GET /api/reports-analytics/category-variations?month=AAAA-MM` — apresenta somente categorias com aumento estritamente superior a 20% em relação à média histórica.
  - **Parâmetros (Query):** `month` (obrigatório, formato `AAAA-MM`); filtros opcionais: `category` e `memberId`.
  - **Resposta (200 OK):**
    ```json
    {
      "period": "2026-11",
      "analysisAvailable": true,
      "historyMonthsUsed": 3,
      "variations": [
        {
          "category": "LAZER",
          "currentAmount": 650.00,
          "historicalAverage": 500.00,
          "variationPercent": 30.00
        }
      ]
    }
    ```
  - **Estado de histórico insuficiente:** Retorna `"analysisAvailable": false`, `"historyMonthsUsed": <n>`, `"variations": []`.
  - **Estado sem variações:** Se nenhuma categoria tiver aumento > 20%, retorna lista vazia em `"variations": []`.

Parâmetros ausentes ou inválidos, mês inválido e intervalo de datas inconsistente retornam HTTP 400 no formato global de erro. As respostas são DTOs e valores monetários são representados como decimais.