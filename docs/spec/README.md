# Especificações do Aurora

Esta pasta contém as especificações funcionais do Aurora, divididas por módulo.
Cada módulo possui um único arquivo Markdown para facilitar leitura, manutenção e consulta pelo time e por agentes de desenvolvimento.

## Módulos
- `auth.md` — autenticação e sessões
- `family-management.md` — grupo familiar, convites e permissões
- `expenses.md` — registro e consulta de despesas
- `payable-bills.md` — contas a pagar
- `receivables.md` — contas a receber
- `credit-cards.md` — cartões e faturas
- `financial-overview.md` — visão financeira e saldo projetado
- `notifications.md` — alertas e lembretes
- `reports-analytics.md` — relatórios e padrões de consumo
- `financial-goals.md` — sugestões e metas de economia

## Convenções
- Regras de negócio e critérios de aceitação estão descritos no próprio módulo.
- Regras de autorização devem ser aplicadas no backend, não apenas na interface.
- Valores monetários devem utilizar tipo decimal apropriado (`BigDecimal` no backend Java).
- Dados de usuários devem sempre ser filtrados pelo grupo familiar e pelas permissões do perfil autenticado.
- Decisões arquiteturais e técnicas ficam em `docs/ADR.md`, quando aplicável.

## Uso com Spec Kit
Esta é uma organização documental simplificada e personalizada. O Spec Kit tradicional pode gerar artefatos adicionais e estrutura própria por feature. Estes arquivos podem servir como especificações de referência para o agente, sem exigir a geração de pastas e documentos auxiliares.
