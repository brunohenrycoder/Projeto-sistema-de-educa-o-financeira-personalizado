# SPEC — Alertas e Notificações (NOTIFICATIONS)

## 1. Objetivo
Especificar os alertas e lembretes automáticos relacionados a vencimentos, despesas e endividamento.

## 2. Atores
- **Principal:** recebe alertas financeiros e lembretes familiares.
- **Dependente:** não acessa alertas e análises financeiras familiares, conforme a matriz de permissões.

## 3. Requisitos funcionais
### NOT-01 — Lembrete de vencimento
- O sistema deve emitir lembrete diário para contas a pagar próximas do vencimento.
- A antecedência padrão é de 3 dias.
- Contas atrasadas devem ser destacadas.
- O lembrete deve parar quando a conta for paga.

### NOT-02 — Alerta de despesas próximas da renda
- O sistema deve alertar quando as despesas mensais atingirem o limite padrão de 80% da renda.
- O cálculo deve considerar despesas de todos os integrantes.
- Deve evitar repetição do mesmo alerta no mesmo mês.

### NOT-03 — Alerta de endividamento
- O sistema deve utilizar os limites de 30% (atenção) e 50% (alerta).
- Os alertas são destinados ao Principal.
- O sistema não deve duplicar o mesmo alerta no mesmo mês.

## 4. Regras de negócio
- **RN-NOT-01:** lembretes de contas a pagar usam antecedência padrão de 3 dias.
- **RN-NOT-02:** contas pagas deixam de gerar lembretes de vencimento.
- **RN-NOT-03:** contas vencidas e não pagas devem ser destacadas.
- **RN-NOT-04:** 80% da renda é o limite padrão para alerta de despesas próximas da renda.
- **RN-NOT-05:** 30% representa nível de atenção de endividamento; 50%, nível de alerta.
- **RN-NOT-06:** alertas financeiros familiares são restritos ao Principal.
- **RN-NOT-07:** alertas equivalentes não devem ser duplicados no mesmo mês.

## 5. Fluxos principais
### Lembrete de vencimento
1. O processo automático consulta contas a pagar.
2. Identifica contas dentro da antecedência configurada.
3. Envia lembrete ao Principal.
4. Interrompe os lembretes quando a conta for paga.
5. Destaca contas vencidas e não pagas.

### Alertas de limites
1. O sistema calcula os indicadores financeiros.
2. Verifica os limites de despesas ou endividamento.
3. Confere se o alerta equivalente já foi emitido no mês.
4. Registra e apresenta o alerta ao Principal, se aplicável.

## 6. Critérios de aceitação
- [ ] Lembretes de contas próximas do vencimento são diários.
- [ ] A antecedência padrão é de 3 dias.
- [ ] Contas atrasadas são destacadas.
- [ ] Contas pagas deixam de gerar lembretes.
- [ ] O limite de despesas é 80% da renda.
- [ ] Os níveis de endividamento são 30% e 50%.
- [ ] Alertas familiares são exibidos somente ao Principal.
- [ ] O mesmo alerta não é duplicado no mês.
