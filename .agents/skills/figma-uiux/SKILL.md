---
name: figma-uiux
description: Use ao interpretar os protótipos oficiais do Aurora no Figma, relacionar telas a requisitos funcionais e traduzir o design para o frontend React. Leitura por padrão; qualquer escrita no Figma exige autorização explícita.
---

# Interpretação dos protótipos Figma (UI/UX)

## 0. Hierarquia documental

1. `.agents/rules/RULES.md`
2. `docs/spec/`
3. `docs/prd/PRD.md`
4. `docs/adr/ADR.md`

Conflitos devem ser informados explicitamente. Não invente cores, fontes, tamanhos, espaçamentos, componentes, comportamentos ou requisitos.

## 1. Fontes oficiais

- Arquivo: `https://www.figma.com/design/I2glqzxJd2h6zQmSCmLGyj/Aurora`.
- Página `0:1 — Page 1`: **43 frames originais** — 20 telas desktop numeradas (01 a 20), 20 frames mobile/visão geral, o guia desktop `9:46650`, o guia mobile `3:33063` e a visão desktop anterior `3:32889`.
- Página `39:2 — MCP - Teste de Escrita`: **não alterar, não usar como referência de produto**.

Os protótipos desktop e mobile existentes são as referências oficiais de interface. O desenvolvimento é mobile first, mas deve preservar a experiência desktop. **Não há pendência sobre qual conjunto usar: ambos são oficiais.**

## 2. Correspondência RF ↔ tela

Todo trabalho deve relacionar cada tela ao RF e à SPEC correspondentes. O guia desktop `9:46650` registra o mapa:

| Telas | Etapa | Requisitos |
|---|---|---|
| 01–02 | Login e cadastro do responsável | RF-001 a RF-002 |
| 03 | Visão geral | RF-011 |
| 04–08 | Contas e confirmações | RF-005 a RF-007, RF-013 |
| 09–11 | Gestão da família | RF-003 |
| 12–13 | Registro e confirmação do dependente | RF-004, RF-008 |
| 14–15 | Gastos e cartão/fatura | RF-009, RF-010 |
| 16 | Alertas | RF-012 a RF-014 |
| 17–18 | Relatórios e análises | RF-015 a RF-017 |
| 19–20 | Metas | RF-018 |

Formulários, confirmações e estados auxiliares são etapas visuais independentes, não lançamentos adicionais.

O mapa do protótipo associa a tela 16 a RF-012–RF-014. A documentação estabelece: RF-012 ↔ NOT-02 (80% da renda, ativo), RF-013 ↔ NOT-01 (lembretes de vencimento) e **RF-014 ↔ NOT-03** (endividamento 30%/50%, adiado), conforme `PRD.md:69-71,105`, `RULES.md:42-51` e `notifications.md:11-35,57,91-96`. Essa correspondência está registrada nos documentos — não crie outra equivalência, não associe RF-014 a NOT-02 e não antecipe a entrega de NOT-03.

## 3. Regras de interpretação

- **Não redesenhe, remova ou modifique elementos por iniciativa própria.**
- **Não invente componentes, estilos, cores, espaçamentos, fontes ou comportamentos.**
- Diferencie explicitamente:
  - **valores efetivamente identificados** nos frames (com ID do frame de origem);
  - **hipóteses e estimativas** marcadas nos guias como provisórias.

O guia rotula como provisórios: limites de 80%, 30%/50%, antecedência de 3 dias, média de 3 meses, variação de 20%, valor sugerido de meta, múltiplos usuários principais e categorias pré-definidas para o dependente. Aplicando a hierarquia documental, os itens que têm regra definida em SPEC foram reclassificados abaixo e **não** são pendentes; os demais permanecem pendentes até decisão explícita:

- **Não é hipótese:** 80% da renda é a regra ativa de NOT-02 (`notifications.md:17-20,32-35`, RN-NOT-04). Não classifique esse valor como pendente.
- **Adiado, não hipótese a implementar:** 30%/50% compõem NOT-03 / RF-014, fora da versão acadêmica (`notifications.md:22-26,57,91-96`).
- **Não é hipótese:** o Dependente pode editar e excluir **somente os gastos que ele próprio registrou** (`RULES.md:99`, `expenses.md:30-34,47`, `family-management.md:49-50`). Essa decisão está aprovada.
- Para os demais itens marcados como provisórios no guia, a SPEC prevalece sempre que houver regra definida; se não houver, permanece pendente de decisão. Não transforme rótulo de protótipo em requisito nem em escolha própria.

Quando uma informação necessária não estiver nos frames nem nos documentos, sinalize como pendente e solicite decisão. Não preencha a lacuna com uma escolha própria.

## 4. Uso responsável do Figma MCP

- Respeite o limite de chamadas do MCP (a conta autenticada tem plano Starter, assento `View`, limite de 20 chamadas/mês).
- **Priorize evidências já disponíveis** antes de qualquer nova chamada: documentação do repositório, diagnósticos anteriores e metadados já coletados.
- Quando uma consulta for necessária, prefira uma única leitura agregada e bem delimitada; nunca repita chamadas por curiosidade.
- `figma-use`, `figma-generate-library`, `figma-generate-design` e `figma-design-to-code` **não são skills registradas no OpenCode neste projeto**. São guias do servidor MCP do Figma, disponíveis como recursos `skill://figma/<id>/SKILL.md` (por exemplo, `skill://figma/figma-use/SKILL.md`). Verifique a disponibilidade no momento do uso; se não houver skill `/figma-use` instalada, carregue o recurso MCP e informe `skillNames: "resource:figma-use"` ao chamar `use_figma`. O mesmo vale para `figma-design-to-code` antes de `get_design_context`, e para `figma-generate-library`/`figma-generate-design` quando aplicáveis.
- Não presuma que esses recursos existem: se não estiverem disponíveis, **pare e informe**, sem inventar substituto.
- Se o limite estiver esgotado, **pare e informe**. Não tente contornar a cota nem apresente valores inferidos como se fossem extraídos.

## 5. Preservação e escrita

- Nunca modifique, mova, renomeie ou exclua os **43 frames originais**.
- Nunca altere a página `39:2 — MCP - Teste de Escrita`.
- Leitura é o modo padrão.
- **Qualquer escrita no Figma exige autorização explícita** e deve ocorrer em uma página separada, com registro do estado antes e validação depois.

## 6. Entrega

Para cada tela analisada, informe: ID da tela, RF/SPEC relacionados, valores identificados com a origem (ID do frame), hipóteses reconhecidas, inconsistências encontradas e pendências que exigem decisão. Não apresente uma tradução para React como definitiva enquanto houver pendência relevante.
