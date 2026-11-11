---
name: nova-slice
description: Use ao implementar um caso de uso (RF) da API do Aurora como uma slice vertical (Vertical Slice Architecture) no Spring Boot, como cadastro, consulta, alteração ou regra de negócio. Guia a criação de endpoint, request, response, service, validação, permissão, isolamento familiar e testes.
---

# Nova slice da API Aurora

Use este passo a passo para implementar **um caso de uso** como uma slice. As regras de negócio (RN-01 a RN-07), a segurança e os padrões de código estão no `RULES.md`: **respeite-as**, sem repetir aqui.

## 1. Entenda o requisito

1. Leia o RF, os critérios de aceitação (CA) e as RN aplicáveis no arquivo do módulo em `docs/spec/` (por exemplo, `expenses.md`; o `README.md` é o índice), no `RULES.md` e nas decisões de `docs/adr/ADR.md`.
2. Procure no código uma slice parecida e siga o mesmo padrão.
3. Responda antes de programar:
   - Quem pode executar? (principal, dependente ou ambos)
   - Quais dados são obrigatórios e quais validações valem?
   - Quais registros podem ser acessados?
   - Que efeitos há em outros registros (fatura, histórico, situação)?
4. Se algo estiver marcado "(a definir)" ou for ambíguo, **pergunte**. Não invente regra nem permissão.

## 2. Planeje a slice

Defina e informe ao desenvolvedor, antes de criar os arquivos:

- **Contexto e nome:** `features/<contexto>/<casodeuso>`, em inglês, minúsculas e sem hífen. O contexto é o módulo da spec (tabela do `RULES.md`). Exemplo: `features/payablebills/paybill`.
- **Endpoint:** método e rota, conforme a spec.
- **Arquivos previstos:** o que vai ser criado e o que de `shared` precisa mudar (se algo precisar).

## 3. Crie os arquivos da slice

Dentro de `features/<contexto>/<casodeuso>/`:

1. **`<UseCase>Request`**: dados de entrada com Bean Validation e mensagens em português, em linguagem simples. Não inclua campos que o back-end determina (usuário, perfil, grupo familiar).
2. **`<UseCase>Response`**: dados de saída. Nunca devolva entidade JPA. Para o dependente, devolva só o que ele pode ver.
3. **`<UseCase>Service`**: toda a regra de negócio do caso de uso (situação inicial, cálculos, RN aplicáveis, histórico, transação).
4. **`<UseCase>Endpoint`**: só HTTP. Rota, `@Valid`, `@PreAuthorize`, chamada à service e status correto (`201` ao criar, `200` ao consultar).
5. **Repository específico**, só se a consulta for usada apenas nesta slice.

Mudanças em `shared/` (entidade nova, enum, repository compartilhado ou componente de domínio) devem ser **pontuais**. Não quebre as slices que já existem.

## 4. Segurança e isolamento (obrigatório em toda slice)

- Obtenha usuário, perfil e grupo familiar pelo `UsuarioAutenticado` (`shared/security`), nunca da requisição.
- Toda consulta ou alteração de dado familiar considera o **ID e o grupo familiar** (por exemplo, `findByIdAndGrupoFamiliarId`).
- Registro de outra família responde `404`, sem revelar que existe.
- Aplique `@PreAuthorize` no endpoint **e** valide a permissão na service.
- Confirme que o dependente é bloqueado quando o requisito exige (RN-01).

## 5. Testes da slice

Crie os testes em `src/test/java/br/com/aurora/features/<contexto>/<casodeuso>/`. No mínimo:

1. Fluxo de sucesso (status, persistência e DTO de resposta).
2. Dados inválidos (campo ausente, valor zero ou negativo, formato errado).
3. Sem autenticação (`401`) e sem permissão (`403`), principalmente o dependente.
4. Registro de outra família (`404`) em leitura, alteração e exclusão, quando houver.
5. As regras específicas do caso de uso (situação inicial, RN-06, RN-07, histórico, duplicidade, fatura).

Rode `./mvnw test` na pasta do back-end e confirme que nada que já funcionava quebrou.

## 6. Checklist antes de finalizar

- [ ] RF, CA e RN relacionados foram consultados.
- [ ] A slice tem pasta própria e DTOs próprios.
- [ ] A slice não chama nem importa outra slice.
- [ ] O endpoint não tem regra de negócio.
- [ ] Usuário e grupo familiar vêm do `UsuarioAutenticado`.
- [ ] As consultas filtram pelo grupo familiar.
- [ ] As permissões estão no endpoint e na service.
- [ ] Valores em dinheiro usam `BigDecimal`.
- [ ] Histórico preservado onde o requisito exige.
- [ ] Testes de sucesso, validação, permissão e isolamento passam.
- [ ] O arquivo do módulo em `docs/spec/` foi atualizado, se o endpoint ou a regra mudou.
- [ ] O commit cita o requisito, por exemplo: `RF-005: cadastro de conta a pagar`.

## 7. Resposta final ao desenvolvedor

Resuma: o que foi implementado, arquivos criados e alterados, endpoint (método e rota), RF e RN atendidos, medidas de segurança aplicadas, testes executados e resultado, e pendências reais. Se algum teste não foi executado ou falhou, diga claramente. Não declare a tarefa concluída com falhas ou comportamentos não validados.
