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
- Alertas financeiros implementados; o alerta de endividamento NOT-03 permanece pendente de uma definição explícita de dívidas.
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
- A interface React + Vite ainda não está incluída neste repositório; as configurações abaixo preparam sua integração.

### Banco de dados
- **PostgreSQL** — armazenamento das informações.

## Arquitetura

O backend utiliza **Vertical Slice Architecture (VSA)**, organizando o código por funcionalidades. Cada funcionalidade concentra os componentes necessários para sua implementação.

Quando implementado, o frontend deverá utilizar organização baseada em funcionalidades (*Feature-based Architecture*).

A estrutura também possui uma área compartilhada (`shared`), destinada a componentes e recursos utilizados por diferentes funcionalidades.

## Organização do projeto

```text
.
├── .agents/
├── aurora-api/
│   ├── src/main/java/br/com/aurora/features/
│   ├── src/main/java/br/com/aurora/shared/
│   └── src/main/resources/db/migration/
├── docs/spec/
└── README.md
```

## Pré-requisitos

Antes de executar o projeto, é necessário ter instalado:

- Java JDK 25.
- Maven ou utilizar o Maven Wrapper incluído no backend.
- PostgreSQL.
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
cd aurora-api
```

Copie o modelo para `.env` e substitua os valores indicados para uso local:

```powershell
Copy-Item .env.example .env
```

O Spring carrega esse arquivo local quando ele existe. O `.env` está ignorado pelo Git; não versione credenciais. Em ambientes compartilhados, forneça as variáveis pelo mecanismo de configuração do ambiente.

Configurações principais:

| Variável | Finalidade | Exemplo de desenvolvimento |
|---|---|---|
| `DB_URL` | URL JDBC do PostgreSQL | `jdbc:postgresql://localhost:5432/aurora` |
| `DB_USERNAME` | Usuário do banco | `postgres` |
| `DB_PASSWORD` | Senha do banco; obrigatória | Defina localmente; o modelo não contém credencial |
| `JWT_SECRET` | Chave HMAC; obrigatória, mínimo de 32 bytes UTF-8 | Gere uma chave aleatória local; não use o placeholder |
| `JWT_EXPIRATION` | Validade do JWT em milissegundos | `86400000` |
| `CORS_ALLOWED_ORIGINS` | Origens explícitas permitidas, separadas por vírgula | `http://localhost:5173` |
| `EMAIL_CONFIRMATION_URL` | Página de confirmação de e-mail | `http://localhost:5173/confirm-email` |
| `FAMILY_INVITE_URL` | Página de convite familiar | `http://localhost:5173/family-invite` |
| `SMTP_HOST`, `SMTP_PORT` | Servidor e porta SMTP | `localhost`, `1025` para um servidor local de captura de e-mail |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | Credenciais SMTP, quando exigidas | Fornecidas pelo ambiente/provedor |
| `SMTP_AUTH` | Habilita autenticação SMTP | `true` ou `false` |
| `SMTP_STARTTLS`, `SMTP_STARTTLS_REQUIRED` | Habilita/exige STARTTLS | `true` ou `false` |
| `SMTP_SSL` | Habilita SSL SMTP | `true` ou `false`; não combinar com STARTTLS sem suporte do provedor |
| `SMTP_CONNECTION_TIMEOUT`, `SMTP_TIMEOUT`, `SMTP_WRITE_TIMEOUT` | Tempos-limite SMTP em milissegundos | `5000` |
| `MAIL_FROM` | Remetente obrigatório no envio de e-mails | Endereço autorizado pelo provedor |

```powershell
$env:DB_PASSWORD="sua_senha_local"
$env:JWT_SECRET="chave_aleatoria_local_com_pelo_menos_32_bytes"
```

As URLs de confirmação e convite apontam por padrão para a porta `5173` do Vite. CORS permite apenas `CORS_ALLOWED_ORIGINS`, incluindo os headers `Authorization` e `Content-Type` necessários ao JWT; autenticação por cookie/credenciais não está habilitada. Em ambiente compartilhado, configure as origens e URLs públicas apropriadas. Não use `*`.

O SMTP não envia e-mails sem configuração externa. Configure host, porta, autenticação, TLS/SSL e remetente conforme o provedor escolhido; o projeto não define um provedor nem credenciais.

### 3. Executar o backend

No diretório do backend, execute:

```powershell
.\mvnw.cmd spring-boot:run
```

Para executar os testes:

```powershell
.\mvnw.cmd test
```

As migrations do banco são gerenciadas pelo Flyway e ficam em:

```text
src/main/resources/db/migration/
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
