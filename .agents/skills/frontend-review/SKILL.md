---
name: frontend-review
description: Use para revisar o frontend do Aurora sob os aspectos técnico, visual e de rastreabilidade de requisitos. A revisão é somente leitura: não corrige arquivos nem altera o Figma.
---

# Revisão do frontend Aurora

## 0. Natureza da revisão

Esta skill é **somente leitura**. Não edite, crie, mova ou exclua arquivos; não modifique o Figma; não corrija o código automaticamente. Apresente achados para decisão do responsável.

## 1. Hierarquia e critérios

Avalie com base em:

1. `.agents/rules/RULES.md` — regras obrigatórias e RN-01 a RN-07.
2. `docs/spec/` — RF, regras por módulo e critérios de aceitação.
3. `docs/prd/PRD.md` — escopo, personas e contexto.
4. `docs/adr/ADR.md` — decisões arquiteturais e técnicas.

Se houver divergência entre documentos, informe-a explicitamente e use a precedência acima. Não reinterprete regras de negócio nem proponha requisitos novos.

## 2. Checklist de revisão

### Rastreabilidade

- RF e critérios de aceitação consultados para cada tela revisada.
- Correspondência entre RF, SPEC, protótipo oficial e implementação.
- Nenhuma funcionalidade inventada para preencher lacuna documental.
- Presença e fidelidade de NOT-01 (3 dias) e **NOT-02 (80% da renda)** conforme `notifications.md:11-35`, sem tratá-los como hipótese e sem recalcular o alerta no frontend.
- Ausência de simulação ou antecipação de **NOT-03 / RF-014** (endividamento 30%/50%, adiado — `notifications.md:22-26,57,91-96`), recomendações textuais do RF-017 e recusa persistida de meta do RF-018.

### Fidelidade visual e responsividade

- Conformidade com os protótipos desktop e mobile oficiais do Figma (skill `figma-uiux`).
- Mobile first mantido, sem rolagem lateral; experiência desktop preservada.
- Textos em português brasileiro e linguagem simples.
- Divergências entre protótipo e regras registradas, não resolvidas arbitrariamente.

### Acessibilidade e usabilidade

- Navegação, contraste, legibilidade, alvos de toque e mensagens de erro compreensíveis.
- Estados de carregamento, vazio e erro tratados sem inventar dados.
- Formulários curtos e utilizáveis em tela pequena.

### API e segurança

- Endpoints e contratos existentes nas SPECs, sem chamadas inventadas.
- Autenticação e tratamento de sessão/token adequados; nada de token ou senha em log.
- Erros da API exibidos conforme o formato documentado.
- **Não amplie RN-01 por interpretação.** Consulte a SPEC de cada funcionalidade e verifique as permissões efetivamente estabelecidas:
  - **Gastos:** o Dependente pode registrar, listar somente os próprios (sem totais ou saldos), editar e excluir somente os próprios (`expenses.md:25-34,101-124`; `RULES.md:99`).
  - **Cartões:** o Dependente pode registrar despesa no crédito, mas não consulta cartões, limites, faturas, pagamentos nem dados administrativos (`credit-cards.md:19-32,165-177`).
  - **Contas a pagar:** acesso restrito ao Principal (`payable-bills.md:7`).
  - **Contas a receber:** acesso restrito ao Principal; o Dependente não consulta, cadastra, altera, cancela nem confirma recebimentos (`receivables.md:7-11`).
  - **Visão consolidada:** somente o Principal consulta saldos, totais e projeções (`financial-overview.md:9-13`).
  - **Notificações e alertas:** somente o Principal (`notifications.md:6-8`).
  - **Relatórios e análises:** somente o Principal (`reports-analytics.md:7-10`).
  - **Metas:** somente o Principal (`financial-goals.md:7-10`).
  - **Gestão familiar:** o Dependente não administra membros nem consulta dados gerais da família (`family-management.md:40-55`).
- Ocultar elementos no frontend nunca substitui a autorização do backend (`RULES.md:77`, `docs/spec/README.md:20`, `family-management.md:65`). A proteção por rota é apenas conveniência.

### Dados financeiros

- Máscara `R$ 1.250,00` na exibição e envio decimal (`1250.00`).
- Nenhum cálculo financeiro feito no frontend com `float`; valores apresentados vêm da API.
- Tratamento correto de `204`, `analysisAvailable: false`, `commitmentPercent: null`, listas vazias e notificações vazias.

### Qualidade e testes

- Código organizado em `src/features`, `src/shared` e `src/routes` conforme `RULES.md:68-75`.
- Ausência de duplicação de regras e de dependências adicionadas sem autorização.
- Testes e lint existentes executados quando disponíveis; se não houver runner de testes no frontend, informar a ausência — não presumir cobertura.

## 3. Formato dos achados

Apresente cada item com:

1. **Severidade:** bloqueante, alta, média ou baixa.
2. **Arquivo e localização:** caminho e linha, ou ID do frame do Figma.
3. **Descrição do problema:** fato observado, sem inferência.
4. **Requisito ou referência:** RF, RN, SPEC, ADR, RULES ou frame citado.
5. **Sugestão de correção:** ação proposta, mantendo-se somente leitura.

Ao final, indique o que foi verificado, o que não pôde ser verificado e as pendências que exigem decisão humana. Não declare conformidade plena se algum achado bloqueante estiver em aberto.
