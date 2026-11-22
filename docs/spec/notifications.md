# SPEC — Alertas e Notificações (NOTIFICATIONS)

## 1. Objetivo
Especificar os alertas e lembretes automáticos relacionados a vencimentos de contas e comprometimento de renda na versão acadêmica atual, documentando a pendência de alertas de endividamento para versão futura.

## 2. Atores
- **Principal:** recebe alertas financeiros e lembretes familiares.
- **Dependente:** não acessa alertas e análises financeiras familiares, conforme a matriz de permissões.

## 3. Requisitos funcionais
### NOT-01 — Lembrete de vencimento (Ativo)
- O sistema deve emitir lembrete diário para contas a pagar próximas do vencimento.
- A antecedência padrão é de 3 dias.
- Contas atrasadas devem ser destacadas.
- O lembrete deve parar quando a conta for paga ou cancelada.

### NOT-02 — Alerta de despesas próximas da renda (Ativo)
- O sistema deve alertar quando as despesas mensais atingirem o limite padrão de 80% da renda familiar considerada.
- O cálculo deve considerar despesas de todos os integrantes da família.
- Deve evitar repetição do mesmo alerta no mesmo mês.

### NOT-03 — Alerta de endividamento (Pendente / Fora do escopo acadêmico)
- Requisito RF-014 postergado para versão futura, após validação de escopo e modelo de dados.
- Os limites previstos originalmente (30% para atenção e 50% para alerta) não estão ativos no sistema.
- As entidades e categorias atuais não classificam formalmente compromissos de dívida, impedindo a automação desse indicador de forma consistente sem premissas arbitrárias.
- Esta funcionalidade não está disponível na entrega acadêmica e não deve ser implementada nem simulada no frontend.

## 4. Regras de negócio
- **RN-NOT-01:** lembretes de contas a pagar usam antecedência padrão de 3 dias.
- **RN-NOT-02:** contas pagas ou canceladas deixam de gerar lembretes de vencimento.
- **RN-NOT-03:** contas vencidas e não pagas devem ser destacadas.
- **RN-NOT-04:** 80% da renda é o limite padrão para alerta de despesas próximas da renda.
- **RN-NOT-05 (Inativa / Pendente):** os níveis de 30% e 50% de endividamento não estão ativos na versão acadêmica atual.
- **RN-NOT-06:** alertas financeiros familiares são restritos ao Principal.
- **RN-NOT-07:** alertas equivalentes não devem ser duplicados no mesmo mês.

## 5. Fluxos principais
### Lembrete de vencimento
1. O processo automático consulta contas a pagar com status `PENDENTE` ou `ATRASADA`.
2. Identifica contas dentro da antecedência configurada (3 dias antes do vencimento) ou atrasadas.
3. Cria a notificação `LEMBRETE_VENCIMENTO` para o Principal.
4. Interrompe novos lembretes quando a conta for paga ou cancelada.
5. Destaca contas vencidas e não pagas.

### Alerta de despesas próximas da renda (80%)
1. O sistema obtém os indicadores financeiros calculados por `FINANCIAL OVERVIEW`.
2. Verifica se as despesas consideradas atingem ou ultrapassam 80% da renda familiar considerada no mês.
3. Confere se o alerta equivalente já foi emitido no mês para a família.
4. Registra a notificação `ALERTA_DESPESAS` e a apresenta ao Principal.

## 6. Critérios de aceitação
- [x] Lembretes de contas próximas do vencimento são diários.
- [x] A antecedência padrão é de 3 dias.
- [x] Contas atrasadas são destacadas.
- [x] Contas pagas deixam de gerar lembretes.
- [x] O limite de despesas é 80% da renda.
- [ ] (Pendente / Fora do escopo acadêmico) Alerta de endividamento nos níveis de 30% e 50% (NOT-03 / RF-014).
- [x] Alertas familiares são exibidos somente ao Principal.
- [x] O mesmo alerta não é duplicado no mês.

## 7. API implementada e contratos para o frontend

- `GET /api/notifications` — Lista as notificações do grupo familiar do Principal autenticado, ordenadas das mais recentes para as mais antigas.
  - Exclusivo do Principal. O grupo familiar é obtido do token JWT.
  - **Resposta (200 OK):**
    ```json
    {
      "notifications": [
        {
          "type": "LEMBRETE_VENCIMENTO",
          "description": "A conta Aluguel vence em 2 dias (20/11/2026).",
          "createdAt": "2026-11-18T08:00:00"
        },
        {
          "type": "ALERTA_DESPESAS",
          "description": "Atenção: seus gastos atingiram 85.00% da sua renda em 2026-11.",
          "createdAt": "2026-11-18T08:00:00"
        }
      ]
    }
    ```
  - **Tipos de notificação existentes:** `LEMBRETE_VENCIMENTO` e `ALERTA_DESPESAS`.
  - **Estado vazio:** Quando não houver notificações geradas, retorna `{"notifications": []}`.

## 8. Rotinas automáticas

- Lembretes são verificados diariamente para contas pendentes ou atrasadas: nos três dias anteriores ao vencimento e enquanto estiverem atrasadas. Contas pagas ou canceladas não geram novos lembretes.
- O alerta de 80% é verificado diariamente e criado uma única vez por grupo familiar, mês e limite, com base nos indicadores calculados por `FINANCIAL OVERVIEW`.
- A rotina de alertas não depende de uma consulta à visão financeira nem de um Principal estar conectado.

## 9. Ponto pendente e rastreabilidade (RF-014)

- `NOT-03` / `RF-014` (Alerta de endividamento) **não está implementado** na versão acadêmica atual.
- As entidades e categorias atuais não identificam com segurança compromissos categorizados como dívidas (ex.: empréstimos, renegociações) versus despesas fixas de consumo.
- Os limites de 30% e 50% aguardam a validação de escopo e a definição de uma classificação explícita de dívidas em versão futura. Categorias genéricas não são presumidas como dívidas.
- A interface React não deve simular alertas de endividamento nem exibir componentes fictícios para NOT-03.
