# Aurora — Sistema de Educação Financeira Personalizada

O **Aurora** é um sistema de educação financeira desenvolvido com o objetivo de auxiliar famílias na organização, no acompanhamento e no planejamento de suas finanças pessoais.

A aplicação permite o gerenciamento de despesas, contas a pagar, valores a receber e cartões de crédito, além de oferecer análises financeiras, alertas e sugestões de economia.

O sistema possui dois perfis de acesso: **Principal** e **Dependente**, com permissões específicas para garantir a privacidade e a organização financeira familiar.

## Objetivos do projeto

- Facilitar o controle financeiro familiar.
- Permitir o registro e acompanhamento de despesas.
- Organizar contas a pagar e valores a receber.
- Disponibilizar análises e relatórios financeiros.
- Auxiliar na identificação de padrões de consumo.
- Oferecer sugestões de economia e metas financeiras.
- Garantir privacidade e controle de acesso entre os membros da família.

## Funcionalidades

### Autenticação e gerenciamento familiar
- Cadastro de usuário Principal.
- Login e autenticação.
- Recuperação de senha.
- Convite e gerenciamento de Dependentes.
- Controle de permissões por perfil.

### Gerenciamento financeiro
- Registro, consulta, edição e exclusão de despesas.
- Gerenciamento de contas a pagar.
- Gerenciamento de valores a receber.
- Gerenciamento de cartões de crédito.
- Acompanhamento de faturas.

### Análises e planejamento
- Visualização de despesas por categoria e membro.
- Acompanhamento do saldo projetado.
- Relatórios financeiros.
- Identificação de padrões de consumo.
- Alertas financeiros.
- Sugestões de economia e metas de poupança.

## Perfis de usuário

| Perfil | Permissões |
|---|---|
| Principal | Gerencia o grupo familiar, consulta informações financeiras da família e acessa todas as funcionalidades permitidas ao seu perfil. |
| Dependente | Registra e gerencia exclusivamente suas próprias despesas, sem acesso aos dados financeiros dos demais membros. |

A aplicação aplica as permissões no backend, garantindo que um usuário não consiga acessar informações às quais não possui autorização.

## Tecnologias utilizadas

### Backend
- **Java** — linguagem de programação.
- **Spring Boot** — desenvolvimento da API REST.
- **Spring Data JPA** — persistência e comunicação com o banco.
- **Spring Security** — autenticação e autorização.
- **Maven** — gerenciamento de dependências e build.
- **Flyway** — versionamento e controle das migrations do banco.

### Frontend
- **React** — construção da interface.
- **Vite** — ferramenta de desenvolvimento e build.

### Banco de dados
- **PostgreSQL** — armazenamento das informações.

## Arquitetura

O backend utiliza **Vertical Slice Architecture (VSA)**, organizando o código por funcionalidades. Cada funcionalidade concentra os componentes necessários para sua implementação.

O frontend utiliza organização baseada em funcionalidades (*Feature-based Architecture*), mantendo os componentes e recursos relacionados próximos uns dos outros.

A estrutura também possui uma área compartilhada (`shared`), destinada a componentes e recursos utilizados por diferentes funcionalidades.

## Organização do projeto

```text
aurora/
├── backend/
│   └── aurora-api/
├── frontend/
├── docs/
│   └── ADR.md
├── spec/
├── .gitignore
└── README.md
```

*Observação: a estrutura apresentada representa a organização planejada do projeto. Os diretórios e documentos serão adicionados conforme o desenvolvimento.*

## Pré-requisitos

Antes de executar o projeto, é necessário ter instalado:

- Java JDK (versão compatível com o projeto).
- Maven ou utilizar o Maven Wrapper incluído no backend.
- PostgreSQL.
- Node.js e npm (para o frontend).
- Git.

## Configuração do ambiente

### 1. Clonar o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd <PASTA_DO_PROJETO>
```

### 2. Configurar o backend

Acesse o diretório do Spring Boot:

```bash
cd backend/aurora-api
```

Crie um arquivo `.env` com as seguintes variáveis:

```env
DB_URL=jdbc:postgresql://localhost:5432/aurora
DB_USERNAME=postgres
DB_PASSWORD=sua_senha
```

Crie também um `.env.example` com os mesmos nomes de variáveis e valores de exemplo, sem credenciais reais.

**Importante:** o Spring Boot não carrega arquivos `.env` automaticamente. As variáveis precisam estar disponíveis no ambiente de execução.

No PowerShell, por exemplo:

```powershell
$env:DB_URL="jdbc:postgresql://localhost:5432/aurora"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="sua_senha"
```

### 3. Executar o backend

No diretório do backend, execute:

```powershell
.\mvnw.cmd spring-boot:run
```

Para executar os testes:

```powershell
.\mvnw.cmd clean test
```

As migrations do banco são gerenciadas pelo Flyway e ficam em:

```text
src/main/resources/db/migration/
```

### 4. Executar o frontend

Após a configuração do frontend, acesse seu diretório e execute:

```bash
npm install
npm run dev
```

## Segurança

O Aurora adota medidas para proteger os dados dos usuários:

- Armazenamento de senhas utilizando hash criptográfico.
- Autenticação e autorização no backend.
- Controle de acesso baseado em perfis.
- Isolamento dos dados de cada grupo familiar.
- Verificação de propriedade dos registros.
- Proteção das informações financeiras dos Dependentes.
- Uso de variáveis de ambiente para configurações sensíveis.

## Controle de versão

O projeto utiliza Git e GitHub para controle de versão e colaboração.

As branches principais são:

- `main`: versão estável do projeto.
- `dev`: branch destinada ao desenvolvimento e integração das funcionalidades.

Funcionalidades maiores podem ser desenvolvidas em branches específicas e posteriormente integradas à `dev`.

## Escopo do projeto

O Aurora tem como foco a educação e organização financeira familiar.

Não fazem parte do escopo atual:
- Simuladores de empréstimos e financiamentos.
- Integração com Open Finance.

## Status do projeto

<code>Em desenvolvimento</code>

Projeto acadêmico desenvolvido como parte de uma atividade universitária.

---

**Aurora — Mais clareza para cuidar das finanças em família.**
