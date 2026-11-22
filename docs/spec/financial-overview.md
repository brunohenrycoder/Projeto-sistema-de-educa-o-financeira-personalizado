# SPEC — Visão Financeira (FINANCIAL OVERVIEW)

## 1. Objetivo

Apresentar ao Principal uma visão consolidada da situação financeira familiar, incluindo saldo projetado, comparação entre despesas e renda e alertas relacionados ao comprometimento da renda.

A visão financeira deverá reunir informações provenientes das funcionalidades de despesas, cartões de crédito, contas a pagar e contas a receber, respeitando os respectivos status e evitando a duplicidade de movimentações.

## 2. Ator

Somente o Principal pode acessar a visão financeira consolidada.

Dependentes não podem consultar saldos, totais, projeções ou informações financeiras agregadas do grupo familiar.

## 3. Requisitos funcionais

### FIN-01 — Saldo projetado

- O sistema deve calcular o resultado financeiro projetado pela diferença entre entradas e saídas.
- O cálculo deve considerar valores realizados e previstos, conforme seus respectivos status.
- Recebimentos pendentes devem ser considerados como entradas previstas.
- Recebimentos confirmados devem ser considerados como entradas realizadas.
- Contas a pagar pendentes devem ser consideradas como saídas previstas.
- Contas pagas devem ser consideradas como saídas realizadas.
- O cálculo deve respeitar as datas efetivas das movimentações realizadas e as datas previstas das movimentações pendentes.
- O resultado deve representar o saldo líquido do período consultado, sem pressupor um saldo bancário inicial.

### FIN-02 — Comparação entre despesas e renda

- O sistema deve acompanhar as despesas mensais em relação à renda familiar.
- O limite padrão para alertar proximidade da renda é de 80%.
- O percentual deve ser calculado pela relação entre as despesas consideradas no período e a renda familiar considerada no mesmo período.
- O alerta deve considerar despesas de todos os integrantes da família.
- Deve existir no máximo um alerta por mês para o mesmo limite.
- O alerta deve ser emitido quando o percentual atingir ou ultrapassar 80%.
- Quando a renda considerada for igual a zero, o sistema não deve realizar divisão por zero nem emitir alerta percentual.

### FIN-03 — Visão consolidada

- O Principal deve visualizar informações financeiras agregadas do grupo familiar.
- Os cálculos devem respeitar o grupo familiar e os registros válidos.
- O sistema deve reunir informações das funcionalidades de despesas, cartões de crédito, contas a pagar e contas a receber.
- Os dados devem ser consolidados sem contabilizar duas vezes a mesma movimentação financeira.
- Dependentes não podem acessar a visão financeira consolidada, diretamente ou por meio de requisições à API.

### FIN-04 — Consulta por período

- O Principal deve poder consultar a visão financeira por período mensal.
- O sistema deve permitir a consulta do mês atual e de outros meses disponíveis.
- Os valores realizados devem respeitar a data efetiva da movimentação.
- Os valores previstos devem respeitar a data prevista da movimentação.
- A comparação entre despesas e renda deve considerar o mesmo período mensal consultado.

### FIN-05 — Separação entre fluxo de caixa e análise de despesas

- O sistema deve distinguir despesas de consumo e saídas efetivas de dinheiro.
- Despesas registradas por meio de cartão de crédito devem participar da análise de consumo no período da compra.
- O pagamento da fatura deve representar a saída efetiva de dinheiro no fluxo de caixa.
- O pagamento da fatura não deve gerar uma nova despesa de consumo referente às compras já registradas.
- A consolidação deve respeitar essa distinção para evitar duplicidade.

### FIN-06 — Prevenção de duplicidade

- Uma mesma movimentação não pode ser contabilizada mais de uma vez no mesmo cálculo.
- Compras no cartão de crédito e pagamentos das respectivas faturas devem ser tratados de acordo com sua natureza.
- A integração entre despesas, contas a pagar e cartões de crédito não deve duplicar valores.
- Recebimentos e pagamentos cancelados não devem participar dos cálculos.
- O sistema deve respeitar os registros de origem e suas relações para identificar movimentações correspondentes.

### FIN-07 — Tratamento de renda igual a zero

- Quando a renda familiar considerada no período for igual a zero, o sistema não deve calcular o percentual de comprometimento da renda.
- O sistema não deve emitir alerta de proximidade da renda baseado em percentual quando não houver renda considerada.
- A ausência de renda não deve impedir a consulta do restante da visão financeira.

## 4. Regras de negócio

- **RN-FIN-01:** somente o Principal pode acessar saldos, projeções e informações financeiras consolidadas.

- **RN-FIN-02:** o saldo projetado corresponde à diferença entre entradas e saídas do período consultado.

- **RN-FIN-03:** valores recebidos e pagos participam do cálculo como movimentações realizadas.

- **RN-FIN-04:** valores pendentes e esperados participam do cálculo como movimentações previstas, respeitando suas datas.

- **RN-FIN-05:** o sistema não deve pressupor um saldo bancário inicial, pois não existe requisito de cadastro desse valor. O resultado representa o saldo líquido projetado do período.

- **RN-FIN-06:** somente registros válidos e não cancelados podem participar dos cálculos.

- **RN-FIN-07:** o alerta de proximidade da renda utiliza 80% como limite padrão.

- **RN-FIN-08:** o percentual de comprometimento da renda deve ser calculado pela divisão das despesas consideradas pela renda familiar considerada, multiplicada por 100.

- **RN-FIN-09:** despesas de todos os integrantes da família devem ser consideradas nos cálculos familiares, independentemente de quem realizou o registro.

- **RN-FIN-10:** o alerta deve ser emitido quando o percentual de comprometimento atingir ou ultrapassar 80%.

- **RN-FIN-11:** não deve haver duplicidade do mesmo alerta no mesmo mês e limite.

- **RN-FIN-12:** quando a renda considerada for igual a zero, o sistema não deve calcular percentual nem emitir alerta percentual.

- **RN-FIN-13:** compras realizadas com cartão de crédito devem ser consideradas na análise de despesas de consumo, mas não podem ser contabilizadas novamente como despesa de consumo quando a fatura for paga.

- **RN-FIN-14:** o pagamento de faturas deve representar uma saída de dinheiro no fluxo de caixa, sem duplicar as compras que compõem a fatura.

- **RN-FIN-15:** as movimentações realizadas devem respeitar suas datas efetivas, enquanto as movimentações previstas devem respeitar suas datas previstas.

- **RN-FIN-16:** todos os cálculos devem utilizar exclusivamente os registros pertencentes ao grupo familiar do Principal autenticado.

- **RN-FIN-17:** a autorização de acesso deve ser validada no back-end em todas as requisições, não dependendo apenas da interface.

- **RN-FIN-18:** o sistema deve distinguir valores realizados de valores previstos na apresentação da visão financeira.

## 5. Definições para consolidação financeira

### 5.1. Entradas

- Recebimentos com status `RECEBIDA` representam entradas realizadas.
- Recebimentos com status `PENDENTE` ou `ATRASADA` representam entradas previstas, considerando a data prevista.
- Recebimentos com status `CANCELADA` não participam dos cálculos.

### 5.2. Saídas

- Contas a pagar com status `PAGA` representam saídas realizadas.
- Contas a pagar com status `PENDENTE` ou `ATRASADA` representam saídas previstas, considerando a data prevista.
- Contas a pagar com status `CANCELADA` não participam dos cálculos.
- Despesas pagas diretamente por outros meios devem representar saídas realizadas conforme seus registros e datas efetivas.
- Despesas realizadas com cartão de crédito devem ser consideradas na análise de consumo, enquanto a quitação da fatura representa a saída efetiva de dinheiro no fluxo de caixa.

### 5.3. Cartões de crédito

- As compras devem ser consideradas na análise de despesas no período em que foram realizadas.
- O pagamento da fatura deve ser considerado como saída no fluxo de caixa na data da quitação.
- O pagamento da fatura não deve criar uma segunda despesa de consumo.
- Parcelas futuras já contratadas devem ser consideradas na projeção conforme as regras de vencimento e faturamento definidas na SPEC de cartões.
- A consolidação deve respeitar os pagamentos e saldos das faturas, sem duplicar valores.

### 5.4. Período de referência

- A consulta padrão deve considerar o mês atual.
- O Principal pode consultar outros meses disponíveis.
- A apuração mensal deve considerar as datas efetivas para movimentações realizadas e as datas previstas para movimentações pendentes.
- A comparação entre renda e despesas deve utilizar o mesmo mês de referência.

## 6. Fórmulas de referência

### Saldo líquido projetado

Saldo líquido projetado = Entradas consideradas − Saídas consideradas.

As entradas e saídas consideradas podem conter movimentações realizadas e previstas, desde que estejam dentro do período consultado e respeitem seus status.

### Percentual de comprometimento da renda

Percentual de comprometimento = (Despesas consideradas ÷ Renda familiar considerada) × 100.

O cálculo somente deve ocorrer quando a renda familiar considerada for maior que zero.

## 7. Fluxos principais

### Consulta de saldo projetado

1. O Principal acessa a visão financeira.
2. O Principal seleciona o período mensal desejado ou utiliza o mês atual.
3. O sistema identifica o grupo familiar do Principal autenticado.
4. O sistema reúne entradas e saídas válidas das funcionalidades financeiras.
5. O sistema diferencia movimentações realizadas e previstas.
6. O sistema elimina possíveis duplicidades entre despesas, contas e faturas.
7. O sistema calcula o saldo líquido projetado.
8. O sistema apresenta os resultados ao Principal.

### Alerta de proximidade da renda

1. O sistema calcula a renda familiar e as despesas consideradas no mês.
2. O sistema verifica se existe renda maior que zero.
3. O sistema calcula o percentual de comprometimento da renda.
4. Ao atingir ou ultrapassar o limite padrão de 80%, verifica se o alerta já foi emitido naquele mês e limite.
5. Se ainda não foi emitido, registra e apresenta o alerta.
6. Se já existir um alerta correspondente, não deve gerar outro.

## 8. Critérios de aceitação

- [ ] Apenas o Principal consulta o saldo projetado e a visão financeira consolidada.
- [ ] O cálculo considera entradas e saídas realizadas e previstas conforme seus status.
- [ ] O resultado representa o saldo líquido do período, sem pressupor saldo bancário inicial.
- [ ] O Principal consegue consultar o mês atual e outros meses disponíveis.
- [ ] Despesas de todos os integrantes entram na consolidação familiar.
- [ ] O sistema diferencia despesas de consumo e saídas efetivas de dinheiro.
- [ ] Compras no cartão não são contabilizadas novamente como despesas de consumo no pagamento da fatura.
- [ ] O pagamento de faturas é considerado no fluxo de caixa sem duplicidade.
- [ ] Registros cancelados não participam dos cálculos.
- [ ] O limite padrão do alerta é 80%.
- [ ] O alerta é emitido quando o percentual atinge ou ultrapassa 80%.
- [ ] O alerta não é duplicado no mesmo mês para o mesmo limite.
- [ ] Quando a renda for zero, não ocorre divisão por zero nem emissão de alerta percentual.
- [ ] Os cálculos respeitam exclusivamente o grupo familiar do Principal autenticado.
- [ ] Dependentes não conseguem acessar a visão financeira consolidada, inclusive diretamente pela API.

## 9. Observações de implementação

- A implementação deve reutilizar os dados e regras já existentes nas funcionalidades `EXPENSES`, `CREDIT CARDS`, `PAYABLE BILLS` e `RECEIVABLES`.
- Não devem ser criados novos registros financeiros apenas para reproduzir movimentações que já existem nas funcionalidades de origem.
- Antes da implementação, devem ser analisadas as entidades, relacionamentos e regras de integração existentes para evitar duplicidade.
- Caso alguma integração necessária ainda não esteja disponível, deve ser identificada e documentada antes de criar uma solução paralela.
- A implementação desta feature não deve alterar as regras de negócio já definidas nas funcionalidades de origem.
- Os cálculos devem utilizar tipos numéricos adequados para valores monetários, preservando a precisão decimal.

## 10. API implementada e contratos para o frontend

- `GET /api/financial-overview?month=AAAA-MM` — Consulta a visão financeira mensal consolidada.
  - **Parâmetro (Query):** `month` é opcional (formato `AAAA-MM`); se omitido, assume o mês corrente.
  - **Acesso:** Restrito ao Principal autenticado via JWT. O grupo familiar é extraído da autenticação.
  - **Resposta (200 OK):**
    ```json
    {
      "period": "2026-11",
      "realizedIncome": 5000.00,
      "plannedIncome": 0.00,
      "realizedExpenses": 1800.00,
      "plannedExpenses": 1200.00,
      "projectedBalance": 2000.00,
      "incomeConsidered": 5000.00,
      "expensesConsidered": 3000.00,
      "commitmentPercent": 60.00,
      "alertThresholdPercent": 80.00,
      "thresholdReached": false,
      "alert": null
    }
    ```
  - **Estado de ausência de movimentações:** Se não houver lançamentos no mês consultado, os campos monetários retornam `0.00`, `commitmentPercent` retorna `null`, `thresholdReached` retorna `false` e `alert` retorna `null`.
  - **Tratamento de renda igual a zero:** Quando `incomeConsidered` for igual a `0.00`, o campo `commitmentPercent` retorna `null` (para evitar divisão por zero), `thresholdReached` retorna `false` e nenhum alerta percentual é gerado. O frontend deve tratar `commitmentPercent == null` sem exibir erro ou indicadores de comprometimento.
  - **Presença de alerta:** Se o comprometimento atingir ou ultrapassar 80% e já houver alerta persistido pela rotina diária no mês, o objeto `alert` é retornado com `id`, `referenceMonth`, `thresholdPercent`, `commitmentPercent` e `createdAt`. A consulta GET não cria notificações.

## 11. Regras de consolidação adotadas

- Pagamentos de contas a pagar são contabilizados pela data efetiva uma única vez; a despesa vinculada não é somada novamente no fluxo de caixa.
- Compras com cartão participam do indicador de despesas pelo valor de cada parcela na competência da fatura. Estornos reduzem as despesas na competência do registro e parcelas futuras canceladas ou reduzidas pelo estorno não são projetadas novamente.
- O fluxo de caixa contabiliza pagamentos de faturas por sua data efetiva e o saldo pendente pelo vencimento. Compras e créditos de estorno não são somados novamente como saídas.
- O cálculo do indicador de comprometimento é reutilizado por `NOTIFICATIONS`, que verifica e persiste o alerta de 80% diariamente, uma única vez por grupo familiar, mês e limite. A consulta GET da visão financeira não cria nem altera notificações.