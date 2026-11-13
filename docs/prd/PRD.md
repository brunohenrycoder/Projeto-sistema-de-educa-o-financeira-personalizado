# Product Requirements Document (PRD) — Sistema Aurora

- **Status:** Rascunho v1.1
- **Data:** novembro de 2026
- **Cliente (entrevista):** professor Mozart
- **Equipe:** [preencher]

## 1. Visão Geral do Produto

- **Nome do Produto:** Aurora.
- **Objetivo:** Sistema de educação financeira automatizada para famílias, focado em ajudar no controle de entradas e saídas, analisando rendas e gastos e sugerindo melhorias financeiras personalizadas.
- **Problema Resolvido:** O "autoconsumo desenfreado" e a perda de controle com cartões de crédito quando o indivíduo passa a ter uma renda maior.
- **Abordagem:** Foco no controle de contas a pagar e a receber (fluxo de caixa). O sistema é pensado primeiramente para dispositivos móveis (mobile first), aceitando também uma versão web para computadores.
- **Natureza dos Registros:** Todas as informações financeiras são inseridas manualmente pelos usuários, sem integração bancária nesta versão.

## 2. Perfis de Usuário e Permissões

### Usuário Principal (Responsável)

- Gerencia o grupo familiar.
- Vê o panorama completo das finanças, inclusive os gastos de todos os membros, cadastra contas a pagar/receber e recebe alertas.
- Acessa relatórios, análises, sugestões e metas.

### Dependente (Ex: Filho)

- Possui acesso restrito para registrar os gastos que ele mesmo gera (ex: corridas de Uber).
- Pode listar, editar e excluir **somente** os gastos que ele próprio registrou, sem ver totais.
- **Restrição de Privacidade:** Não visualiza saldos, totais ou contas dos pais (conforme RN-01).

## 3. Escopo do Projeto

### No Escopo

- Cadastro e autenticação de usuários principais e dependentes.
- Gestão de membros do grupo familiar.
- Cadastro e controle de contas a pagar e a receber (com suporte a repetição mensal e situações como pendente, paga, atrasada, cancelada, prevista).
- Lançamento rápido de gastos por membros e dependentes, com listagem, edição e exclusão dos próprios gastos pelo dependente.
- Controle de cartão de crédito e fatura em aberto.
- Cálculo de saldo previsto (semana/mês).
- Alertas de orçamento, vencimento de contas e endividamento.
- Relatórios de gastos por categoria e pessoa, análises de renda/gastos e sugestões de melhoria.
- Metas automáticas de economia.

### Fora do Escopo

- Simulador de empréstimos e financiamentos (recusado explicitamente pelo cliente na entrevista).
- Integração com Open Finance (não solicitada pelo cliente; melhoria futura).

Em caso de conflito entre o enunciado do projeto e a entrevista, a entrevista prevalece.

## 4. Resumo dos Requisitos Funcionais (RF)

**Essenciais**

- **RF-001 — Cadastro de usuário principal:** Criação de conta, gerando perfil principal e grupo familiar automático. O e-mail informado deve ser confirmado antes que a conta possa ser utilizada.
- **RF-002 — Login e encerramento de sessão:** Autenticação por e-mail e senha para Principal e Dependente; após 5 tentativas consecutivas incorretas, bloquear o identificador por 15 minutos. Logout deve revogar a sessão no servidor.
- **RF-003 — Cadastro de membros da família:** Inclusão, alteração e remoção lógica (situação REMOVIDO) de membros pelo usuário principal.
- **RF-004 — Perfis de acesso:** Restrições rígidas baseadas no perfil (Principal vs. Dependente) aplicadas em toda requisição.
- **RF-005 — Cadastro de conta a pagar:** Registro de despesas previstas com valores, vencimentos, categorias e repetição.
- **RF-006 — Cadastro de conta a receber:** Registro de entradas previstas (salário, renda extra, etc.).
- **RF-007 — Pagamento e recebimento de contas:** Confirmação de baixa de contas, exigindo forma de pagamento obrigatória para despesas.
- **RF-008 — Lançamento de gasto por membro:** Registro ágil de despesas individuais vinculadas ao usuário logado, com listagem, edição e exclusão dos próprios gastos.
- **RF-010 — Cartão de crédito e fatura em aberto:** Agregação de despesas no cartão e acompanhamento da fatura.
- **RF-011 — Saldo previsto:** Comparativo entre o que vai entrar, sair e sobrar no período.

**Importantes**

- **RF-009 — Consulta de gastos por membro:** Acompanhamento detalhado pelo usuário principal.
- **RF-012 — Alerta de gastos perto da renda:** Aviso preventivo contra autoconsumo desenfreado.
- **RF-013 — Aviso de contas próximas do vencimento:** Notificações diárias sobre contas a vencer ou atrasadas.
- **RF-014 — Alerta de endividamento:** Monitoramento do comprometimento da renda com fixas, parcelas e cartões.
- **RF-015 — Relatório de gastos:** Visão por categoria e por pessoa da família.
- **RF-016 — Análise de renda e gastos:** Identificação de padrões comparando com médias anteriores.
- **RF-017 — Sugestões personalizadas:** Insights informativos baseados nas variações de gastos.
- **RF-018 — Metas automáticas:** Sugestões de economia calculadas a partir da sobra média familiar.

Se faltar tempo, cortar nesta ordem: RF-018, RF-017, RF-016, RF-015.

## 5. Regras de Negócio Principais (RN)

- **RN-01:** Dependentes nunca visualizam totais, saldos ou contas do usuário principal. A única informação financeira que o dependente vê é a lista dos próprios gastos, sem totais.
- **RN-02:** Todo gasto fica rigidamente vinculado a quem o registrou. O dependente só edita e exclui os gastos que ele mesmo registrou.
- **RN-03:** Somente o usuário principal adiciona ou remove membros da família.
- **RN-04:** Análises e sugestões respeitam permissões (apenas o principal vê a visão global).
- **RN-05:** Metas automáticas são apenas sugeridas; exigem decisão de aceitação do usuário.
- **RN-06:** A forma de pagamento é obrigatória ao pagar contas e lançar gastos para rastreio do cartão.
- **RN-07:** Contas vencidas sem pagamento passam automaticamente para a situação ATRASADA.

## 6. Requisitos Não Funcionais (RNF)

- **RNF-01:** Abordagem mobile first com responsividade web.
- **RNF-02:** Privacidade rigorosa com criptografia de senha (hash) e tráfego HTTPS.
- **RNF-03:** Segurança robusta com validação de perfil por requisição e filtro estrito por grupo familiar.
- **RNF-04:** Sincronização centralizada via servidor e banco de dados único.
- **RNF-05:** Stack tecnológica definida: Backend Java com Spring Boot, banco de dados relacional PostgreSQL e frontend web responsivo.
- **RNF-06:** Lançamento rápido de despesas para dependentes.
- **RNF-07:** Linguagem simples e acessível nas telas e mensagens.
- **RNF-08:** Compatibilidade com navegadores modernos.

## 7. Pontos em aberto com o cliente

1. O cartão de crédito terá só registro manual, ou controle de limite e parcelas?
2. Pode haver mais de um usuário principal (por exemplo, um casal)?
3. Quais alertas ele quer receber e por qual canal (aviso no app, notificação, e-mail)?
4. Os dependentes precisam de categorias pré-definidas ao lançar um gasto?
5. Os percentuais dos alertas (80% no RF-012; 30% e 50% no RF-014) fazem sentido?
6. As categorias sugeridas atendem, ou ele quer outras?
7. Ele precisa registrar contas parceladas (por exemplo, 6x no cartão)?

## 8. Critérios de sucesso

- Todos os requisitos **essenciais** funcionam de ponta a ponta, com os critérios de aceitação passando.
- O dependente é bloqueado em todas as telas e endpoints do responsável, inclusive ao chamar a API diretamente.
- O sistema é usável em tela de celular, sem rolagem lateral.
- A documentação (requisitos, PRD, ADR e spec) está atualizada com as respostas do cliente.
