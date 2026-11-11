# ADR.md — Decisões de arquitetura do Aurora

> Este documento consolida as decisões de arquitetura e implementação
> estabelecidas para o Aurora, com base no Documento de Requisitos e nas
> orientações técnicas fornecidas para o projeto. Não substitui o
> documento de requisitos, o PRD ou as especificações dos módulos.

- **Status:** Aceita
- **Data:** novembro de 2026

## 1. Contexto do projeto

O Aurora é um sistema de educação financeira automatizada para famílias.
Seu objetivo é ajudar no controle de entradas e saídas financeiras,
analisar gastos e apresentar sugestões de melhoria.

A aplicação não é um aplicativo bancário: as informações financeiras são
registradas manualmente pelos usuários.

### 1.1. Tecnologias adotadas

- **Backend:** Java com Spring Boot e Maven.
- **Frontend:** React com Vite.
- **Banco de dados:** PostgreSQL.
- **Interface:** aplicação web responsiva, com abordagem mobile-first.

## 2. Organização da arquitetura

### 2.1. Organização do backend: Vertical Slice Architecture (VSA)

Pacote-base: `br.com.aurora`.

O código é organizado **por caso de uso** (slice), e não por camada
técnica. Cada requisito funcional (ou parte dele) corresponde a uma
slice, em `features/<contexto>/<casodeuso>/`.

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
        ├── <UseCase>Endpoint
        ├── <UseCase>Request
        ├── <UseCase>Response
        ├── <UseCase>Service
        └── (repository específico, se a consulta for só desta slice)
```

Os contextos em `features/` espelham os módulos de `docs/spec/`:
`auth`, `familymanagement`, `payablebills`, `receivables`, `expenses`,
`creditcards`, `financialoverview`, `notifications`, `reportsanalytics`
e `financialgoals`. Exemplos de slices: `features/auth/registeruser`,
`features/payablebills/createpayablebill` e
`features/expenses/registerexpense`. Nomes de pacotes e classes em
inglês; mensagens e textos de tela em português.

Decisões:

- Uma slice por caso de uso. Cada slice tem os próprios Request e
  Response.
- O endpoint trata apenas da comunicação HTTP e não concentra regras de
  negócio. As regras ficam na service da slice.
- Slices não chamam umas às outras. A lógica usada por três ou mais
  slices (por exemplo, o cálculo do saldo) vira um componente de domínio
  nomeado em `shared/domain`.
- Entidades JPA e repositories usados por duas ou mais slices ficam em
  `shared/domain`.
- O usuário autenticado, seu perfil e seu grupo familiar são obtidos
  sempre por `UsuarioAutenticado`, em `shared/security`.
- Não serão usadas bibliotecas de mediator nem abstrações extras.
- O frontend também é organizado por funcionalidade
  (`src/features/<contexto>/`), com um `shared` para o cliente da API,
  a autenticação e os componentes comuns.

**Motivo:** o back-end será feito por duas pessoas em cerca de três
semanas. A organização por camadas globais (controller, service,
repository, model, dto, security), prevista inicialmente, espalha cada
requisito por várias pastas e aumenta os conflitos no Git. A VSA mantém
cada caso de uso em um só lugar e permite dividir o trabalho por slices.
A organização por camadas foi **substituída** por esta decisão.

**Riscos e mitigações:** como cada slice faz as próprias consultas, é
fácil esquecer o filtro por grupo familiar. Mitigação: o
`UsuarioAutenticado` como ponto único de identidade e os testes
obrigatórios de permissão e de isolamento em toda slice.

### 2.2. API, DTOs e validação

- A API deve utilizar DTOs de entrada e saída; nunca deve expor
  entidades diretamente.
- Os endpoints devem receber e validar os DTOs da slice com `@Valid`,
  quando aplicável, e delegar as regras de negócio à service da slice.
- As validações devem utilizar Bean Validation, com mensagens em
  português simples.
- Para textos, utilizar as validações pertinentes, como `@NotBlank` e
  `@Size`.
- Para valores monetários obrigatórios e positivos, utilizar validação
  equivalente a `@NotNull` e
  `@DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")`.
- Para datas obrigatórias, utilizar `@NotNull`.
- O tratamento de erros deve seguir o formato definido em
  `docs/spec/README.md`, com os campos `status`, `erro`, `mensagens`
  e `caminho`.
- Utilizar HTTP `201` para criação, `200` para consultas bem-sucedidas
  e `404` quando o registro não existir ou pertencer a outro grupo
  familiar.

### 2.3. Valores monetários

- Utilizar `BigDecimal` para representar e calcular valores
  monetários.
- Não utilizar `double` ou `float` para valores ou cálculos
  financeiros.
- Utilizar colunas `DECIMAL(12,2)` para valores em reais, conforme a
  orientação técnica do projeto.
- Validar no backend os valores que, conforme os requisitos, devem ser
  maiores que zero.

## 3. Autenticação, autorização e proteção dos dados

### 3.1. Autenticação

- A aplicação deve permitir login e encerramento de sessão para
  usuários principais e dependentes.
- O login utiliza e-mail e senha.
- A senha deve ter no mínimo 8 caracteres, conforme RF-001.
- Senhas devem ser armazenadas como hash, utilizando BCrypt conforme a
  orientação técnica do projeto.
- Senhas e tokens não devem ser registrados em logs.
- Após várias tentativas incorretas consecutivas, o sistema deve
  bloquear temporariamente o acesso, conforme RF-002. O número de
  tentativas e o tempo de bloqueio ainda estão a definir.
- Credenciais inválidas devem produzir uma mensagem genérica, sem
  informar se o erro ocorreu no e-mail ou na senha.
- Um membro removido não pode entrar no sistema.
- Como o token JWT não pode ser cancelado antes de expirar, o servidor
  confere a situação do usuário (ATIVO) em toda requisição protegida.
  Assim, ao remover um membro, ele é bloqueado imediatamente, mesmo
  que possua um token ainda válido, conforme RNF-03.

### 3.2. Autorização e identidade do usuário

- A verificação do perfil deve ocorrer no servidor em toda requisição
  protegida.
- As permissões devem ser aplicadas no backend, utilizando
  `@PreAuthorize` nos endpoints quando pertinente e verificações de
  domínio nas services.
- O backend não deve confiar em identificadores de usuário, perfil ou
  grupo familiar enviados pelo frontend.
- O usuário autenticado deve ser identificado pelo contexto de
  segurança do Spring Security, por meio do `UsuarioAutenticado`.
- O usuário responsável pelo lançamento de um gasto deve ser obtido da
  autenticação, nunca de um campo enviado pelo cliente.
- Toda consulta a dados familiares deve ser filtrada pelo grupo
  familiar do usuário autenticado.
- Consultas de registros familiares devem utilizar métodos de
  repository que considerem o grupo familiar, evitando buscas isoladas
  por identificador quando isso puder permitir acesso a registros de
  outro grupo.
- Um registro pertencente a outro grupo familiar não deve ser
  disponibilizado ao solicitante.

### 3.3. Perfis e permissões

O sistema possui dois perfis: `PRINCIPAL` e `DEPENDENTE`.

**Usuário principal:**

- Tem acesso às funcionalidades previstas para o responsável.
- Pode incluir, alterar e remover membros do grupo familiar.
- Pode cadastrar e gerenciar as contas e demais informações financeiras
  previstas nos requisitos.
- Pode visualizar as informações, relatórios, análises, sugestões e metas
  do grupo familiar, inclusive os gastos de todos os membros.

**Dependente:**

- Pode registrar os gastos que ele mesmo gera.
- Pode listar os gastos que ele próprio registrou, **sem totais nem
  saldos**.
- Pode editar e excluir somente os gastos que ele próprio registrou.
- Não pode ver, editar ou excluir gastos registrados por outro membro.
- Não pode cadastrar contas a pagar ou a receber, marcar contas como
  pagas ou recebidas, nem acessar as funcionalidades que a matriz de
  permissões do RF-004 marca como não permitidas.
- Após registrar um gasto, deve visualizar somente a confirmação do
  lançamento, sem saldos ou totais.
- Não pode visualizar saldos, totais ou contas do usuário principal.
- Não pode visualizar cartões e faturas, saldo previsto, alertas,
  relatórios, análises, sugestões, metas ou gerenciamento de membros.

As restrições do dependente devem ser aplicadas também ao acesso direto
aos endpoints, e não apenas pela ocultação de telas no frontend.

### 3.4. Regras de negócio relacionadas às permissões

- **RN-01:** dependentes nunca visualizam totais, saldos ou contas do
  usuário principal. A única informação financeira que o dependente vê
  é a lista dos próprios gastos, sem totais.
- **RN-02:** todo gasto fica vinculado a quem o registrou.
- **RN-03:** somente o usuário principal adiciona ou remove membros.
- **RN-04:** somente o usuário principal visualiza a análise do
  conjunto da família.
- **RN-05:** metas automáticas são apenas sugestões; o usuário decide
  se aceita. Nenhuma meta pode ser criada sem confirmação.
- A edição e a exclusão de gastos pelo dependente ficam limitadas aos
  gastos registrados pelo próprio dependente, conforme a definição
  estabelecida para o projeto.

## 4. Regras financeiras e integridade dos registros

- **RN-06:** a forma de pagamento é obrigatória ao marcar uma conta a
  pagar como paga e ao lançar um gasto.
- **RN-07:** uma conta a pagar cujo vencimento passou sem pagamento
  deve passar automaticamente para a situação `ATRASADA`.
- Despesas registradas com cartão de crédito devem compor o valor em
  aberto da fatura, conforme RF-008 e RF-010.
- Contas a pagar mensais devem gerar a próxima ocorrência quando a
  ocorrência atual for paga, conforme RF-005 e RF-007.
- Contas e registros cuja remoção deve preservar histórico não devem
  ser apagados fisicamente. Deve ser utilizada a situação de
  cancelamento ou remoção prevista no requisito.
- A exclusão de um gasto pelo seu autor é lógica (situação
  `CANCELADO`). O gasto cancelado deixa de compor saldos e faturas, e o
  histórico é preservado.
- Quando o requisito exigir histórico, devem ser preservados quem
  alterou, o que foi alterado e a data e hora da alteração.
- A remoção de um membro não deve apagar seus registros históricos.

## 5. Requisitos não funcionais

- **RNF-01 --- Mobile first:** a interface deve ser pensada primeiro
  para celular e também funcionar de forma responsiva em computadores.
- **RNF-02 --- Privacidade:** os dados financeiros devem respeitar as
  permissões definidas em RN-01 e RN-04; senhas devem ser armazenadas
  como hash e a comunicação deve utilizar HTTPS.
- **RNF-03 --- Segurança de acesso:** o perfil deve ser verificado em
  toda requisição; consultas devem ser filtradas pelo grupo familiar
  do usuário logado; ao remover um membro, ele perde o acesso
  imediatamente.
- **RNF-04 --- Sincronização:** gastos lançados por dependentes devem
  aparecer para o usuário principal, inclusive em aparelhos
  diferentes. Os usuários acessam o mesmo servidor e banco de dados.
- **RNF-05 --- Tecnologia:** backend em Java com Spring Boot, banco de
  dados relacional PostgreSQL e frontend web responsivo.
- **RNF-06 --- Lançamento rápido:** registrar um gasto deve exigir
  poucos toques.
- **RNF-07 --- Linguagem simples:** telas, mensagens, sugestões e
  alertas devem evitar termos técnicos ou financeiros complexos.
  Mensagens de erro devem explicar o que fazer.
- **RNF-08 --- Compatibilidade:** a aplicação deve funcionar nas
  versões atuais de Chrome, Firefox, Edge e Safari, em celular e
  computador.

## 6. Testes

Para cada endpoint novo, implementar testes que cubram, no mínimo:

1.  Cenário de sucesso com o perfil permitido.
2.  Acesso por perfil não permitido, especialmente `DEPENDENTE`, quando
    aplicável.
3.  Tentativa de acessar registro pertencente a outro grupo familiar,
    com resposta `404`.
4.  Dados inválidos, com resposta `400` e mensagem clara.
5.  Regra principal do requisito implementado.

Também devem ser cobertos, conforme a funcionalidade:

- Permissões de principal e dependente.
- Isolamento dos dados entre grupos familiares.
- Listagem, edição e exclusão de gastos pelo dependente somente quando
  registrados por ele.
- Transições de situação das contas.
- Cálculos monetários com `BigDecimal`.
- Composição da fatura e recorrência de contas.
- Bloqueio de acesso de membros removidos, inclusive com token ainda
  válido.
- Preservação do histórico quando exigida pelo requisito.

A conclusão visual de uma funcionalidade no React não substitui a
implementação das regras no backend nem a aprovação dos testes.

## 7. Fluxo de implementação de requisitos

Antes de implementar um requisito funcional:

1.  Ler a SPEC do módulo em `docs/spec/` (o `README.md` é o índice).
2.  Consultar o RF e seus critérios de aceitação no Documento de
    Requisitos ou em `docs/prd/PRD.md`.
3.  Consultar as decisões aplicáveis neste documento
    (`docs/adr/ADR.md`).
4.  Respeitar as regras descritas nos documentos do projeto.
5.  Analisar o código existente e suas dependências antes de modificar
    arquivos, preservando funcionalidades já implementadas.
6.  Implementar a slice do caso de uso (request, response, service e
    endpoint, e o repository específico quando necessário), alterando
    `shared/` apenas de forma pontual.
7.  Implementar os testes do requisito.
8.  Atualizar a SPEC quando endpoints ou regras forem alterados.
9.  Utilizar no commit uma referência ao requisito, por exemplo:
    `RF-005: cadastro de conta a pagar`.

Ao concluir, informar resumidamente:

- O que foi criado ou alterado.
- Quais arquivos foram criados ou modificados.
- Quais endpoints foram implementados.
- Quais critérios de aceitação foram cobertos.
- O resultado dos testes.
- O que ainda precisa ser esclarecido ou implementado, caso exista.

## 8. Fora do escopo

Não implementar nesta versão:

- **Simulador de empréstimos ou financiamentos:** prevista no
  enunciado, mas recusada explicitamente pelo cliente na entrevista.
- **Integração com Open Finance:** não solicitada pelo cliente; fica
  como melhoria futura.

**Decisão:** em caso de conflito entre o enunciado do projeto e a
entrevista com o cliente, a entrevista prevalece.

## 9. Documentos relacionados

Este ADR deve ser lido em conjunto com:

- Documento de Requisitos do Aurora.
- `docs/prd/PRD.md`.
- Especificações dos módulos em `docs/spec/` (um arquivo por módulo,
  com índice em `README.md`).
- Regras do assistente de código em `.agents/rules/RULES.md`.

O Documento de Requisitos define as funcionalidades, regras de negócio e
critérios de aceitação. Este ADR consolida as decisões de arquitetura e
implementação para orientar o desenvolvimento, sem substituir os
requisitos.
