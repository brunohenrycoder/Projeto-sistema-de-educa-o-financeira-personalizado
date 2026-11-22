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

### GOAL-02 — Decisão do usuário e ações sobre a sugestão

O Principal decide se deseja criar uma meta e com qual valor. O sistema estabelece distinção clara entre quatro ações:

1. **Aceitar a sugestão:** O Principal utiliza o valor de sobra média retornado pela consulta e o submete como `targetAmount` na confirmação.
2. **Ajustar o valor sugerido:** O Principal altera o valor sugerido para qualquer valor positivo desejado e o submete como `targetAmount` na confirmação.
3. **Recusar ou dispensar a sugestão:** A API do Aurora não possui suporte, endpoint, campo ou tabela para persistir a recusa de uma sugestão. A interface do frontend pode permitir que o usuário dispense ou feche visualmente o card de sugestão, mas essa ação é puramente de exibição em tela (estado transitório da UI) e **não equivale a uma recusa registrada ou persistida no backend**. Fica registrada a limitação funcional atual e a pendência de decisão pelo responsável pelo projeto sobre a eventual criação de um fluxo de recusa persistida no futuro.
4. **Confirmar uma meta:** A meta é efetivamente criada e persistida apenas quando o Principal submete a requisição explícita de confirmação (`POST /api/financial-goals/confirm`).

O sistema não pode criar metas automaticamente sem confirmação explícita.

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
- **RN-GOAL-15:** a recusa de sugestões não é persistida pela API do backend. Eventual botão de dispensar/descartar na interface do frontend opera exclusivamente em nível de estado local da tela e não equivale a uma recusa registrada no banco de dados.

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
- A sobra média é apenas informativa. Não existe conversão automática para valor-alvo; o Principal define e confirma o valor da meta.
- Consultar a referência de sobra não cria uma meta. A criação ocorre apenas pela operação explícita de confirmação.
- O escopo implementado permite consultar metas e seus valores confirmados; prazos e métricas de progresso não são definidos por esta especificação.
- **Relação com RF-017:** Este módulo não consome as variações de categorias do `REPORTS-ANALYTICS` para gerar conselhos nem cria recomendações textuais personalizadas. O frontend não deve simular tais comportamentos.
- **Limitação de recusa:** A ausência de endpoint de recusa no backend é uma limitação documental conhecida desta versão acadêmica. Qualquer decisão de auditoria ou histórico de descarte dependerá de decisão futura do responsável pelo produto.

## 8. API implementada e contratos para o frontend

Todas as operações são exclusivas do Principal autenticado via JWT:

- `GET /api/financial-goals/savings-suggestion` — Retorna a sugestão de economia baseada na sobra média dos três meses anteriores.
  - **Sucesso com sobra positiva (200 OK):**
    ```json
    {
      "averageMonthlySurplus": 450.00
    }
    ```
  - **Média não positiva ou ausência de dados (204 No Content):** Quando a sobra média for menor ou igual a zero, ou não houver movimentações financeiras nos meses anteriores, a API responde HTTP `204 No Content` (sem corpo). O frontend deve tratar esse status ocultando a área de sugestão automática ou informando que não há sugestão de economia calculável no momento.

- `POST /api/financial-goals/confirm` — Confirma e cria uma meta com o valor-alvo informado pelo Principal.
  - **Payload:**
    ```json
    {
      "targetAmount": 450.00
    }
    ```
  - **Validações:** `targetAmount` é obrigatório, deve ser positivo (`> 0`), com até duas casas decimais e até 10 dígitos inteiros.
  - **Resposta (201 Created):**
    ```json
    {
      "id": "uuid...",
      "targetAmount": 450.00,
      "createdAt": "2026-11-18T10:00:00"
    }
    ```
  - Utilizado tanto para **aceitar** (repassando o valor sugerido) quanto para **ajustar** (informando novo valor-alvo).

- `GET /api/financial-goals` — Lista as metas financeiras confirmadas do grupo familiar.
  - **Resposta (200 OK):** Lista de metas confirmadas `[{ "id": "uuid...", "targetAmount": 450.00, "createdAt": "..." }]`.
  - **Estado vazio:** Quando não houver metas criadas, retorna lista vazia `[]`.

- **Operação de recusa/descarte:** Não existe endpoint `POST /api/financial-goals/reject` ou equivalente. Se a interface gráfica fornecer um botão para dispensar a exibição da sugestão, o frontend deve apenas ocultar visualmente o componente no estado local da aplicação, tendo ciência de que nenhuma informação é enviada ao servidor.