# SPEC — Visão Financeira (FINANCIAL OVERVIEW)

## 1. Objetivo
Apresentar ao Principal uma visão consolidada da situação financeira familiar, incluindo saldo projetado e alertas relacionados à renda e às despesas.

## 2. Ator
Somente o Principal pode acessar a visão financeira consolidada.

## 3. Requisitos funcionais
### FIN-01 — Saldo projetado
- O sistema deve calcular o saldo projetado pela diferença entre entradas e saídas.
- O cálculo deve considerar valores recebidos/pagos e valores previstos/pendentes, conforme sua situação.

### FIN-02 — Comparação entre despesas e renda
- O sistema deve acompanhar as despesas mensais em relação à renda.
- O limite padrão para alertar proximidade da renda é 80%.
- O alerta deve considerar despesas de todos os integrantes da família.
- Deve existir no máximo um alerta por mês para o mesmo limite.

### FIN-03 — Visão consolidada
- O Principal deve visualizar informações financeiras agregadas do grupo familiar.
- Os cálculos devem respeitar o grupo familiar e os registros válidos.

## 4. Regras de negócio
- **RN-FIN-01:** somente o Principal acessa saldos e projeções.
- **RN-FIN-02:** saldo projetado corresponde a entradas menos saídas.
- **RN-FIN-03:** valores pagos/recebidos e pendentes/esperados participam da projeção conforme sua situação.
- **RN-FIN-04:** o alerta de proximidade da renda utiliza 80% como limite padrão.
- **RN-FIN-05:** despesas de Dependentes são consideradas nos cálculos familiares.
- **RN-FIN-06:** não deve haver duplicidade do mesmo alerta no mesmo mês e limite.

## 5. Fluxos principais
### Consulta de saldo projetado
1. O Principal acessa a visão financeira.
2. O sistema reúne entradas e saídas do grupo familiar.
3. O sistema calcula o saldo projetado.
4. O sistema apresenta o resultado ao Principal.

### Alerta de proximidade da renda
1. O sistema calcula a relação entre despesas mensais e renda.
2. Ao atingir o limite padrão de 80%, verifica se o alerta já foi emitido naquele mês.
3. Se ainda não foi emitido, registra e apresenta o alerta.

## 6. Critérios de aceitação
- [ ] Apenas o Principal consulta saldo projetado.
- [ ] O cálculo considera entradas e saídas previstas e realizadas conforme seus status.
- [ ] Despesas de todos os integrantes entram na consolidação.
- [ ] O limite padrão do alerta é 80%.
- [ ] O alerta não é duplicado no mesmo mês para o mesmo limite.
- [ ] Dependentes não conseguem acessar a visão financeira consolidada.
