# RULES – Projeto Aurora

Estas regras valem para **toda** tarefa neste repositório. O passo a passo de como criar uma funcionalidade está na skill `nova-slice`. As regras de negócio (RN) ficam **somente aqui**.

## 1. Contexto

**Aurora – Sistema de Educação Financeira Automatizada.** Projeto universitário feito em dupla, com entrega até o fim de novembro de 2026. O sistema ajuda famílias a registrar despesas, controlar contas a pagar e a receber, acompanhar o cartão de crédito e receber alertas e sugestões.

A especificação fica em `docs/spec/`: o `README.md` é o índice e traz as convenções gerais da API (incluindo o formato de erro), e há **um arquivo por módulo** (`auth.md`, `expenses.md`, `payable-bills.md` etc.) com os requisitos (RF), critérios de aceitação (CA) e regras daquele módulo. As decisões de arquitetura estão em `docs/adr/ADR.md` e o PRD em `docs/prd/PRD.md`.

## 2. Stack (não trocar sem autorização)

- **Back-end:** Java, Spring Boot, Maven, Spring Data JPA, Spring Security, JWT, Bean Validation.
- **Front-end:** React com Vite, responsivo e mobile first.
- **Banco:** PostgreSQL.

## 3. Arquitetura do back-end: Vertical Slice Architecture (`docs/adr/ADR.md`, seção 2.1)

O código é organizado **por caso de uso** (slice), e não por camada técnica. Pacote base: `br.com.aurora`.

```
br.com.aurora
├── AuroraApplication.java
├── shared/
│   ├── security/   JWT, filtro, configuração e UsuarioAutenticado
│   ├── error/      tratamento global de erros e formato padrão de erro
│   ├── domain/     entidades JPA, enums e componentes de domínio usados por várias slices
│   └── config/     configurações gerais
└── features/
    └── <contexto>/<casodeuso>/
        ├── <UseCase>Endpoint.java
        ├── <UseCase>Request.java
        ├── <UseCase>Response.java
        ├── <UseCase>Service.java
        └── (repository específico, se a consulta for só desta slice)
```

Os contextos em `features/` **espelham os módulos de `docs/spec/`** (nomes em inglês, sem hífen):

| Módulo da spec          | Contexto em `features/` | Requisitos                   |
| ----------------------- | ----------------------- | ---------------------------- |
| `auth.md`               | `auth`                  | RF-001, RF-002               |
| `family-management.md`  | `familymanagement`      | RF-003, RF-004               |
| `payable-bills.md`      | `payablebills`          | RF-005, RF-007 (pagamento)   |
| `receivables.md`        | `receivables`           | RF-006, RF-007 (recebimento) |
| `expenses.md`           | `expenses`              | RF-008, RF-009               |
| `credit-cards.md`       | `creditcards`           | RF-010                       |
| `financial-overview.md` | `financialoverview`     | RF-011                       |
| `notifications.md`      | `notifications`         | RF-012, RF-013, RF-014       |
| `reports-analytics.md`  | `reportsanalytics`      | RF-015, RF-016, RF-017       |
| `financial-goals.md`    | `financialgoals`        | RF-018                       |

Exemplos de slices: `features/auth/registeruser`, `features/payablebills/createpayablebill`, `features/expenses/registerexpense`. Nomes de pacotes e classes em inglês, no mesmo idioma dos módulos; mensagens e textos de tela em português.

Regras:

- **Uma slice por caso de uso** (um RF ou parte dele). Nomes de pacote em minúsculas, sem acento nem hífen.
- O **Endpoint** cuida só da comunicação HTTP: rota, `@Valid`, `@PreAuthorize` e chamada à service. Sem regra de negócio nem cálculo financeiro.
- A **Service da slice** contém as regras de negócio e as verificações de permissão e de grupo familiar daquele caso de uso.
- Cada slice tem os **próprios Request e Response**. Não reutilize os DTOs de outra slice. Nunca devolva entidade JPA na API.
- **Slices não chamam umas às outras** nem importam classes internas umas das outras.
- Lógica usada por três ou mais slices (por exemplo, o cálculo do saldo) vira um **componente de domínio nomeado** em `shared/domain`. Prefira duplicar um pouco a acoplar duas slices.
- **Entidades** ficam em `shared/domain`. Um repository usado por duas ou mais slices também. Um repository usado só por uma slice fica nela.
- **Não crie** services genéricos que juntem vários casos de uso (por exemplo, `ContaService`).
- Não adicione bibliotecas de mediator nem abstrações extras. Uma pasta por caso de uso com poucos arquivos basta.
- Uma pasta por funcionalidade **no código** é esperada. A proibição de pastas e documentos por módulo vale **só para documentação** (ver seção 5).

## 4. Estrutura do front-end

```
src/
├── features/<contexto>/   componentes, páginas, hooks e chamadas à API da funcionalidade
├── shared/                cliente da API (com token), contexto de autenticação, componentes de UI e formatação de moeda e data
└── routes/                rotas e proteção por perfil
```

- Rotas protegidas por perfil são só conveniência. **A segurança é do back-end.**
- Mobile first: projete primeiro para tela pequena (por exemplo, 375 px), com menu inferior, botões grandes e formulários curtos. Sem rolagem lateral.
- Valores em reais aparecem com máscara (`R$ 1.250,00`), mas são enviados e recebidos como número decimal (`1250.00`).
- Exiba as mensagens de erro da API. Textos de tela em português e em linguagem simples, sem jargão financeiro.
- Nunca registre token ou senha no console.

## 5. Documentação e requisitos

Antes de implementar qualquer coisa:

1. Consulte `docs/spec/README.md` e o arquivo do módulo correspondente (por exemplo, `docs/spec/expenses.md`) e identifique o RF, as RN, os RNF, os requisitos de segurança e os CA aplicáveis.
2. Analise o código existente para evitar duplicidade ou incompatibilidade.

Atualize o arquivo do módulo em `docs/spec/` quando um endpoint ou uma regra mudar. Não crie pastas ou documentos por funcionalidade fora dessa estrutura (`spec.md`, `plan.md`, `tasks.md`, `research.md` etc.).

Não crie funcionalidades, permissões ou regras que não estejam nos requisitos ou nos ADRs. As decisões já registradas são válidas. Se faltar uma decisão ou algo estiver marcado "(a definir)", **pergunte antes de inventar**.

## 6. Regras de negócio (fonte única)

**Perfis:** _Principal_ (responsável pelo grupo familiar) e _Dependente_ (permissões limitadas).

- **RN-01 – Privacidade financeira.** O dependente nunca vê informações financeiras gerais do principal ou da família: totais, saldos, contas, receitas, despesas de outros integrantes, faturas, relatórios, análises, alertas e sugestões. A restrição vale também contra acesso direto à API, troca de parâmetros e manipulação de identificadores. A única exceção é a lista dos próprios gastos do dependente, sem totais nem saldos (RN-02).
- **RN-02 – Responsável pelo registro.** Toda despesa (gasto) fica vinculada ao usuário que a registrou, obtido pelo contexto de segurança. Nunca aceite esse identificador vindo do front-end. O dependente pode registrar os próprios gastos, **listar os próprios gastos (sem totais nem saldos)** e editar ou excluir **somente** os gastos que ele mesmo registrou. Nunca pode ver, editar ou excluir gastos de outro integrante. O principal vê os gastos de todos os membros (RF-009). A exclusão de um gasto é lógica (situação CANCELADO) e preserva o histórico.
- **RN-03 – Gerenciamento familiar.** Só o principal adiciona, altera ou remove integrantes. A remoção não apaga o histórico financeiro. O integrante removido perde o acesso mesmo com um JWT ainda válido.
- **RN-04 – Análises familiares.** Só o principal vê análises, relatórios, indicadores e sugestões baseados nos dados da família.
- **RN-05 – Metas.** Meta sugerida não é criada sem confirmação. O principal aceita, ajusta ou recusa.
- **RN-06 – Forma de pagamento.** Obrigatória ao registrar uma despesa e ao marcar uma conta a pagar como paga. A validação é feita no back-end.
- **RN-07 – Contas atrasadas.** Conta a pagar não quitada até o vencimento assume a situação ATRASADA, de forma consistente nas consultas e nos processos automáticos.

## 7. Segurança e autenticação

- Proteja os endpoints com Spring Security e autentique com JWT.
- Obtenha o usuário autenticado **sempre** pelo contexto de segurança, por meio do `UsuarioAutenticado` em `shared/security`. É o único ponto que entrega usuário, perfil e grupo familiar.
- Verifique o perfil **e a situação atual** do usuário (ATIVO) em toda operação protegida.
- Nunca confie em ID de usuário, perfil ou grupo familiar enviados pelo front-end.
- Senhas com BCrypt. Nunca em texto puro. Nunca registre senha, token ou dados de autenticação em log.
- Isolamento entre famílias: não use `findById()` isolado para dados familiares. Consulte pelo ID **e** pelo grupo familiar autorizado (por exemplo, `findByIdAndGrupoFamiliarId`). Registro de outra família responde como **não encontrado**, sem revelar que existe.

## 8. Padrões de implementação

- **Dinheiro:** `BigDecimal` no Java e `DECIMAL(12,2)` no PostgreSQL. Nunca `double` ou `float`.
- **DTOs e validação:** Bean Validation com mensagens claras em português. Valide obrigatórios, formatos e valores positivos.
- **Transações:** use quando uma operação alterar vários registros. Evite lançamentos, pagamentos, recebimentos ou ocorrências recorrentes duplicados.
- **Histórico:** onde os requisitos pedirem cancelamento ou remoção lógica, não apague fisicamente. Registre quem fez a ação e a data e hora.

## 9. Padrão da API

Use o formato de erro definido em `docs/spec/README.md` (campos `status`, `erro`, `mensagens`, `caminho`).

| Código | Quando                                          |
| ------ | ----------------------------------------------- |
| 200    | Consulta ou operação concluída                  |
| 201    | Recurso criado                                  |
| 400    | Dados inválidos ou regra violada                |
| 401    | Não autenticado                                 |
| 403    | Autenticado sem permissão                       |
| 404    | Registro inexistente ou de outro grupo familiar |

## 10. Testes

Toda funcionalidade precisa de testes. Rode com `./mvnw test`, na pasta do back-end. Os testes de cada slice ficam em pastas espelhadas em `src/test/java/br/com/aurora/features/...`.

Quando aplicável, cubra: fluxo de sucesso, dados inválidos, usuário sem autenticação, dependente em funcionalidade restrita, dependente listando, editando ou excluindo gasto de outro integrante, registro de outra família (leitura, alteração e exclusão), integrante removido, valores monetários, transições de status, histórico, recorrências e faturas.

Não considere a funcionalidade pronta só porque o fluxo de sucesso passou.

## 11. Preservação do projeto

Antes de alterar um arquivo existente, leia seu conteúdo, as classes relacionadas e o que pode ser afetado. Faça alterações pontuais em vez de substituir arquivos inteiros. Não remova funcionalidades sem autorização. Não crie arquivos, módulos ou endpoints desnecessários. Não mude decisões arquiteturais sem justificativa e autorização.

## 12. Fora do escopo (não implementar)

- Simulador de empréstimos.
- Simulador de financiamentos.
- Integração com Open Finance.

## 13. Ao concluir uma tarefa

Informe: o que foi implementado, arquivos criados e alterados, endpoints, RF e RN atendidos, testes executados com resultado e pendências reais. Diga claramente se algum teste não foi executado ou falhou.
