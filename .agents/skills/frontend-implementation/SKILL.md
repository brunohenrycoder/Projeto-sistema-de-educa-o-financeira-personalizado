---
name: frontend-implementation
description: Use ao implementar telas, componentes, rotas, estados e integração com a API no frontend React + Vite do Aurora. Aplica a hierarquia documental do projeto, as regras de RULES.md, as SPECs e os protótipos oficiais do Figma.
---

# Implementação do frontend Aurora

## 0. Hierarquia documental

Sempre nesta ordem:

1. `.agents/rules/RULES.md` — regras gerais e restrições obrigatórias; fonte única das RN-01 a RN-07.
2. `docs/spec/` — requisitos funcionais, regras por módulo e critérios de aceitação (índice em `docs/spec/README.md`).
3. `docs/prd/PRD.md` — contexto, objetivos, personas e escopo geral.
4. `docs/adr/ADR.md` — decisões arquiteturais e técnicas.

Em caso de divergência, siga essa precedência e **informe explicitamente o conflito**. Não invente requisitos, regras de negócio, comportamentos ou decisões. Se faltar informação ou algo estiver "(a definir)", registre como pendente e **pergunte antes de implementar**.

## 1. Leitura obrigatória antes de escrever código

- `.agents/rules/RULES.md` (integral).
- `docs/spec/README.md` e o arquivo do módulo da SPEC correspondente ao RF.
- `docs/prd/PRD.md` para escopo, RF e critérios de sucesso.
- `docs/adr/ADR.md` para decisões aplicáveis.
- O protótipo oficial do Figma da tela envolvida (use a skill `figma-uiux`).
- O código existente em `aurora-frontend/src`, para evitar duplicidade ou incompatibilidade.

Uma funcionalidade parcialmente implementada no backend **não** implica que ela já esteja disponível no frontend: confirme o contrato na SPEC antes de consumi-la.

## 2. Stack e linguagem

- **Stack travada:** React com Vite, responsivo e mobile first (`RULES.md:11-15`). Não troque sem autorização.
- **JavaScript ou TypeScript:** não existe decisão documentada no repositório. O estado atual é JavaScript (arquivos `.jsx`, sem `tsconfig.json`); a presença de `@types/react` em `devDependencies` não constitui decisão de migração. **Não escolha arbitrariamente e não migre sem autorização.** Registre a questão como pendente se ela afetar a tarefa.

## 3. Organização do código

Conforme `RULES.md:68-75`:

```
src/
├── features/<contexto>/   componentes, páginas, hooks e chamadas à API da funcionalidade
├── shared/                cliente da API (com token), contexto de autenticação,
│                          componentes de UI e formatação de moeda e data
└── routes/                rotas e proteção por perfil
```

- Contextos em inglês, minúsculas e sem hífen; espelham os módulos de `docs/spec/`.
- Nomes de código em inglês; **textos de tela e mensagens em português brasileiro**, linguagem simples, sem jargão financeiro.
- Alterações pontuais em arquivos existentes; leia antes de alterar (`RULES.md:143-145`).

## 4. Regras de implementação

### Interface

- Mobile first: projete primeiro para tela pequena (referência de 375 px em `RULES.md:78`), com menu inferior, botões grandes e formulários curtos. **Sem rolagem lateral.**
- Mantenha a experiência desktop prevista nos protótipos oficiais. Se a largura dos frames mobile (402 px) divergir da referência das regras (375 px), **registre a divergência**; não resolva por conta própria.
- Respeite fidelidade ao protótipo: não redesenhe, não remova elementos e não invente estados.

### Dados monetários

- Exiba valores com máscara brasileira, por exemplo `R$ 1.250,00`, e envie/receba como número decimal (`1250.00`).
- **Nunca use `float` para cálculos financeiros.** Não recalcule no frontend valores que são responsabilidade do backend; apresente os valores retornados pela API.
- Datas no formato previsto pela SPEC (`AAAA-MM-DD` ou `AAAA-MM`).

### API, autenticação e permissões

- Consuma **somente** endpoints e contratos já documentados nas SPECs. Não crie endpoint, campo ou regra nova no backend sem autorização explícita.
- Respeite o formato de erro (`status`, `erro`, `mensagens`, `caminho`), exiba as mensagens da API e trate estados de carregamento, vazio e erro.
- Trate respostas `204` previstas nas SPECs (por exemplo, sugestão de metas sem sobra positiva) e sinais como `analysisAvailable: false`, `commitmentPercent: null`, `variations: []` e `notifications: []` sem exibir erro.
- Use o token de autenticação conforme o contrato da API; nunca registre token ou senha no console.
- Não confie em ID de usuário, perfil ou grupo familiar enviados pelo cliente.
- Ocultar uma tela ou ação no frontend é **conveniência**, não segurança (`RULES.md:77`, `docs/spec/README.md:20`). Respeite RN-01 a RN-05 e as permissões específicas de cada módulo:
  - **Gastos:** o Dependente pode registrar, listar somente os próprios (sem totais ou saldos), editar e excluir somente os próprios (`RULES.md:99`, `expenses.md:25-34,101-124`).
  - **Cartões:** pode registrar despesa no crédito sem informar ou consultar identificadores de cartão ou fatura; não consulta cartões, limites, faturas, pagamentos, estornos nem dados administrativos (`credit-cards.md:19-32,165-177`).
  - **Contas a pagar:** acesso restrito ao Principal (`payable-bills.md:7`).
  - **Contas a receber:** acesso restrito ao Principal; o Dependente não consulta, cadastra, altera, cancela nem confirma recebimentos (`receivables.md:7-11`).
  - **Visão consolidada:** somente o Principal consulta saldos, totais e projeções (`financial-overview.md:9-13`).
  - **Notificações e alertas:** somente o Principal (`notifications.md:6-8`).
  - **Relatórios e análises:** somente o Principal (`reports-analytics.md:7-10`).
  - **Metas:** somente o Principal (`financial-goals.md:7-10`).
  - **Gestão familiar:** o Dependente não administra membros nem consulta dados gerais da família (`family-management.md:40-55`).

### Limites de escopo

- Respeite o que está ativo na SPEC: NOT-01 (lembrete de vencimento, 3 dias) e **NOT-02 (80% da renda)** — `notifications.md:11-35`. NOT-02 não é hipótese; exiba os dados fornecidos pela API, sem recalcular o alerta no frontend.
- Não implemente nem simule: **NOT-03 / RF-014 (endividamento 30%/50%, adiado)** — `notifications.md:22-26,57,91-96`; recomendações textuais do RF-017; recusa persistida de meta (RF-018); saldos, totais agregados e projeções destinados ao Dependente — o que não impede a exibição do valor das próprias despesas permitidas (`RULES.md:99`, `expenses.md:25-34`). A correspondência RF-014 ↔ NOT-03 é a registrada em `PRD.md:71,105` e `notifications.md:22-26,57,91-96`: não crie outra equivalência nem antecipe a entrega.
- Fora do escopo: simuladores de empréstimos/financiamentos e integração Open Finance (`RULES.md:147-151`).
- **Não adicione dependências sem autorização explícita.**
- **Não altere o backend, PRD, SPECs nem ADRs para acomodar o frontend.** Se a tela exigir dado não fornecido pela API, pare e reporte.

## 5. Antes de concluir

Verifique: RF e CA originários consultados; protótipo correspondente confrontado; contratos da API seguidos; perfis e isolamento respeitados; máscara monetária correta; mensagens de erro exibidas; nenhuma funcionalidade inventada; pendências listadas.

Informe o que foi implementado, arquivos criados/alterados, RF/RN atendidos, verificações executadas e pendências reais (`RULES.md:153-155`). Não declare a tarefa concluída se houver ambiguidade relevante sem decisão.
