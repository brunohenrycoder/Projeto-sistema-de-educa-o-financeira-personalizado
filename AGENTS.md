# Aurora — instruções gerais do projeto

Aurora é um sistema de educação financeira familiar. Stack definida: **backend Java + Spring Boot + Maven + JPA + Spring Security + JWT**, **frontend React + Vite responsivo e mobile first**, **PostgreSQL** (`RULES.md:11-15`). Registros financeiros são manuais; não é aplicativo bancário.

## Leitura obrigatória

Antes de qualquer tarefa, leia integralmente `.agents/rules/RULES.md`. Ele vale para **toda** tarefa neste repositório e é a **fonte única das regras de negócio RN-01 a RN-07**. Este arquivo é apenas um índice: não duplique seu conteúdo aqui.

## Hierarquia documental

Quando houver divergência, siga esta ordem e **informe explicitamente o conflito**:

1. `.agents/rules/RULES.md` — regras gerais e restrições obrigatórias.
2. `docs/spec/` — requisitos funcionais, regras por módulo e critérios de aceitação; o `README.md` é o índice.
3. `docs/prd/PRD.md` — contexto, objetivos, personas e escopo geral.
4. `docs/adr/ADR.md` — decisões arquiteturais e técnicas.

Não invente requisitos, regras de negócio, comportamentos ou decisões. Se uma informação necessária estiver indefinida ou marcada como "(a definir)", trate como **pendente** e solicite decisão antes de implementar.

## Antes de implementar

- Consulte `docs/spec/README.md` e o módulo da SPEC correspondente ao RF, mesmo que o código já exista.
- Consulte `docs/adr/ADR.md` para decisões técnicas aplicáveis.
- Analise o código existente para evitar duplicidade e incompatibilidade.
- Mantenha rastreabilidade: **RF → SPEC → protótipo oficial → implementação → verificação**.
- Os protótipos desktop e mobile são ambos referências oficiais do Aurora.
- Uma funcionalidade implementada no backend não pode ser presumida como disponível no frontend; confirme o contrato na SPEC.

## Skills do projeto

Carregue a skill adequada quando relevante:

- `nova-slice` — implementar um caso de uso da API como slice vertical (backend).
- `frontend-implementation` — implementar telas, componentes, rotas e integração React/Vite.
- `figma-uiux` — interpretar protótipos oficiais e traduzi-los para o frontend.
- `frontend-review` — revisão técnica, visual e de rastreabilidade (somente leitura).

## Limites

- Fora do escopo: simuladores de empréstimos/financiamentos e integração Open Finance (`RULES.md:147-151`).
- Não altere backend, PRD, SPECs ou ADRs para acomodar outra camada sem autorização.
- Não adicione dependências sem autorização explícita.
- Não faça commits ou pushes sem solicitação.
- Não modifique o Figma sem autorização explícita. Os 43 frames originais e a página `MCP - Teste de Escrita` são preservados; qualquer escrita deve ocorrer em página separada, com validação antes e depois.

## Interrupção e entrega

Se encontrar ambiguidade relevante, conflito documental ou decisão pendente que afete o resultado, **interrompa a implementação e pergunte**. Não escolha arbitrariamente para destravar.

Ao concluir, informe o que foi feito, arquivos criados/alterados, RF e RN atendidos, verificações executadas com resultado e pendências reais, conforme `RULES.md:153-155`.
