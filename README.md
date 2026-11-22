# Aurora — Sistema de Educação Financeira Personalizada

O **Aurora** é um sistema de educação financeira para famílias. Ele ajuda o responsável a controlar contas a pagar e a receber, permite que cada membro da família registre os próprios gastos e apresenta análises, alertas e sugestões de economia.

O sistema não é um aplicativo bancário: todas as informações financeiras são registradas manualmente pelos usuários, sem integração com bancos.

> Projeto acadêmico de Engenharia de Software. **Status: versão acadêmica final.**

## Sumário

- [Perfis de usuário](#perfis-de-usuário)
- [Funcionalidades](#funcionalidades)
- [Escopo da versão acadêmica](#escopo-da-versão-acadêmica)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como executar](#como-executar)
- [Roteiro de demonstração](#roteiro-de-demonstração)
- [Testes](#testes)
- [Segurança](#segurança)
- [Documentação](#documentação)
- [Controle de versão](#controle-de-versão)
- [Equipe](#equipe)

## Perfis de usuário

| Perfil | O que pode fazer |
|---|---|
| **Principal** (responsável) | Gerencia o grupo familiar, cadastra contas a pagar e a receber, acompanha cartões e faturas, vê os gastos de todos os membros e acessa visão financeira, notificações, relatórios, análises e metas. |
| **Dependente** | Registra, lista, edita e exclui **somente os próprios gastos**. Não vê saldos, totais, contas nem gastos de outros membros. |

As permissões são aplicadas **no back-end**. Esconder uma tela no front-end não é a proteção.

## Funcionalidades

| Módulo | Requisitos | O que entrega |
|---|---|---|
| Autenticação | RF-001, RF-002 | Cadastro do responsável, confirmação de e-mail, login, encerramento de sessão e bloqueio temporário após tentativas incorretas |
| Família | RF-003, RF-004 | Convite e remoção de dependentes, aceite do convite e perfis de acesso |
| Contas a pagar | RF-005, RF-007 | Cadastro, pagamento, cancelamento, recorrência mensal e histórico |
| Contas a receber | RF-006, RF-007 | Cadastro, confirmação de recebimento, cancelamento, recorrência mensal e histórico |
| Gastos | RF-008, RF-009 | Registro rápido; o principal acompanha os gastos de todos, e o dependente só os próprios |
| Cartões de crédito | RF-010 | Cartão, limite, compras (inclusive parceladas), faturas, pagamentos, estornos e créditos, conforme `docs/spec/credit-cards.md` |
| Visão financeira | RF-011 | Saldo previsto do período |
| Notificações | RF-012, RF-013 | Alerta de gastos próximos da renda e aviso de contas a vencer ou atrasadas |
| Relatórios e análises | RF-015 a RF-017 | Gastos por categoria e por membro, padrões de consumo e sugestões de melhoria |
| Metas | RF-018 | Sugestão e acompanhamento de metas de economia |

## Escopo da versão acadêmica

**Fora do escopo** (por decisão do cliente e do PRD):

- Simuladores de empréstimos e de financiamentos.
- Integração com Open Finance e com bancos.

**Adiado para uma versão futura:**

- **RF-014 — Alerta de endividamento (NOT-03).** O modelo de dados atual não classifica dívidas de forma formal, então o alerta de 30% e 50% da renda não foi implementado nem é simulado na interface. A decisão está registrada no PRD e em `docs/spec/notifications.md`.

Os itens ainda sem definição do cliente estão em "Pontos em aberto" do `docs/prd/PRD.md`.

## Tecnologias

**Back-end**

- Java 25 e Spring Boot 4.1
- Spring Web, Spring Data JPA, Spring Security (JWT) e Bean Validation
- Flyway (versionamento do banco) e Maven (com Maven Wrapper)
- Envio de e-mail por SMTP (confirmação de e-mail e convites)

**Front-end**

- React 19 e Vite 8, com React Router
- Vitest para testes e ESLint
- Interface responsiva, com abordagem mobile first

**Banco de dados**

- PostgreSQL

## Arquitetura

**Back-end: Vertical Slice Architecture (VSA).** O código é organizado por caso de uso, e não por camada técnica. Cada funcionalidade fica em `features/<contexto>/<casodeuso>/`, com seu endpoint, request, response e service. O que é comum (segurança, tratamento de erros, entidades e componentes de domínio) fica em `shared/`. Os contextos espelham os módulos de `docs/spec/`: `auth`, `familymanagement`, `payablebills`, `receivables`, `expenses`, `creditcards`, `financialoverview`, `notifications`, `reportsanalytics` e `financialgoals`.

**Front-end: organização por funcionalidade.** Em `src/features/` há uma pasta por módulo, e em `src/shared/` ficam o cliente da API (com o token de acesso), a autenticação e a formatação de valores e datas. `src/routes/` reúne as rotas e a proteção por perfil.

## Estrutura do repositório

```text
.
├── aurora-api/                  # Back-end (Spring Boot)
│   ├── src/main/java/br/com/aurora/
│   │   ├── features/            # Casos de uso, por contexto
│   │   └── shared/              # Segurança, erros, domínio e e-mail
│   └── src/main/resources/db/migration/   # Migrations do Flyway
├── aurora-frontend/             # Front-end (React + Vite)
│   └── src/
│       ├── features/
│       ├── shared/
│       └── routes/
├── aurora-design-reference/     # Protótipos e guia de design
├── docs/
│   ├── prd/PRD.md               # Requisitos do produto
│   ├── adr/ADR.md               # Decisões de arquitetura
│   └── spec/                    # Especificação por módulo
├── AGENTS.md                    # Diretrizes para assistentes de código
└── README.md
```

## Como executar

### Pré-requisitos

- Java JDK 25
- PostgreSQL
- Node.js 22 LTS ou superior e npm
- Git
- Um servidor de e-mail de teste (recomendado: [Mailpit](https://github.com/axllent/mailpit)), porque o cadastro exige confirmar o e-mail

Os comandos abaixo usam PowerShell (Windows). No Linux e no macOS, use `./mvnw` no lugar de `.\mvnw.cmd`.

### 1. Clonar o repositório

```powershell
git clone https://github.com/brunohenrycoder/Projeto-sistema-de-educa-o-financeira-personalizado.git
cd Projeto-sistema-de-educa-o-financeira-personalizado
```

### 2. Criar o banco de dados

No PostgreSQL, crie o banco:

```sql
CREATE DATABASE aurora;
```

As tabelas são criadas pelo Flyway na primeira execução do back-end.

### 3. Subir o servidor de e-mail de teste

Com Docker:

```powershell
docker run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
```

Os e-mails enviados pelo Aurora (confirmação de cadastro e convites) aparecem em **http://localhost:8025**, e nenhum e-mail é enviado de verdade.

### 4. Configurar e executar o back-end

```powershell
cd aurora-api
Copy-Item .env.example .env
```

Edite o `.env` e preencha, no mínimo, `DB_PASSWORD`, `JWT_SECRET` e `MAIL_FROM`. O arquivo `.env` é ignorado pelo Git, e nenhuma credencial deve ser versionada. Se preferir, defina as variáveis na própria janela do terminal:

```powershell
$env:DB_PASSWORD="sua_senha_local"
$env:JWT_SECRET="chave_aleatoria_local_com_pelo_menos_32_bytes"
$env:MAIL_FROM="no-reply@aurora.local"
```

Principais variáveis:

| Variável | Finalidade | Exemplo de desenvolvimento |
|---|---|---|
| `DB_URL` | URL JDBC do PostgreSQL | `jdbc:postgresql://localhost:5432/aurora` |
| `DB_USERNAME` | Usuário do banco | `postgres` |
| `DB_PASSWORD` | Senha do banco (obrigatória) | Definida localmente |
| `JWT_SECRET` | Chave de assinatura do JWT (obrigatória, mínimo de 32 bytes) | Chave aleatória local |
| `JWT_EXPIRATION` | Validade do token, em milissegundos | `86400000` |
| `CORS_ALLOWED_ORIGINS` | Origens permitidas, separadas por vírgula | `http://localhost:5173` |
| `EMAIL_CONFIRMATION_URL` | Página de confirmação de e-mail | `http://localhost:5173/confirm-email` |
| `FAMILY_INVITE_URL` | Página de convite familiar | `http://localhost:5173/family-invite` |
| `SMTP_HOST`, `SMTP_PORT` | Servidor de e-mail | `localhost`, `1025` (Mailpit) |
| `MAIL_FROM` | Remetente dos e-mails (obrigatório) | `no-reply@aurora.local` |

A lista completa, incluindo as opções de autenticação e TLS do SMTP, está em `aurora-api/.env.example`. O CORS permite somente as origens informadas (nunca use `*`).

Execute:

```powershell
.\mvnw.cmd spring-boot:run
```

A API fica em **http://localhost:8080**.

### 5. Configurar e executar o front-end

Em outro terminal:

```powershell
cd aurora-frontend
Copy-Item .env.example .env
npm install
npm run dev
```

O arquivo `.env` do front-end define a URL da API (`VITE_API_BASE_URL=http://localhost:8080`). A aplicação abre em **http://localhost:5173**.

Para gerar a versão de produção: `npm run build`.

## Roteiro de demonstração

Com o back-end, o front-end e o Mailpit em execução:

1. **Cadastrar o responsável:** em `/register`, preencha nome, e-mail e senha (mínimo de 8 caracteres).
2. **Confirmar o e-mail:** abra o Mailpit (http://localhost:8025), clique no link de confirmação e entre com o e-mail e a senha.
3. **Convidar um dependente:** na tela de família, informe o e-mail do dependente. O convite chega no Mailpit.
4. **Aceitar o convite:** abra o link do convite, defina a senha do dependente e entre com ele.
5. **Como dependente:** registre um gasto, edite-o e exclua-o. Confira que só os gastos próprios aparecem e que as telas do responsável (visão financeira, contas, cartões, relatórios) não ficam disponíveis.
6. **Como responsável:** cadastre contas a pagar e a receber, registre um cartão e uma compra, e veja o gasto do dependente, a visão financeira, as notificações, os relatórios e as metas.
7. **Celular:** repita o fluxo em uma janela estreita do navegador (cerca de 375 px de largura) para conferir a versão mobile.

## Testes

**Back-end** (na pasta `aurora-api`):

```powershell
.\mvnw.cmd test
```

Os testes usam o banco configurado em `DB_URL`. Para não alterar os seus dados de desenvolvimento, crie um banco separado (por exemplo, `aurora_test`) e aponte `DB_URL` para ele antes de rodar.

**Front-end** (na pasta `aurora-frontend`):

```powershell
npm test
npm run lint
```

A suíte do front-end pode levar alguns minutos.

## Segurança

- Senhas armazenadas somente como hash.
- Autenticação por JWT, com validação do usuário e da sessão a cada requisição protegida. Um membro removido perde o acesso na hora, mesmo com um token ainda válido.
- Autorização por perfil no back-end e isolamento dos dados de cada grupo familiar. Um registro de outra família é tratado como não encontrado.
- Bloqueio temporário de login após tentativas incorretas.
- Configurações sensíveis por variáveis de ambiente. Nenhum segredo é versionado.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/prd/PRD.md`](docs/prd/PRD.md) | Visão do produto, escopo, requisitos, regras de negócio e pontos em aberto |
| [`docs/adr/ADR.md`](docs/adr/ADR.md) | Decisões de arquitetura e de implementação |
| [`docs/spec/`](docs/spec/) | Especificação por módulo, com os contratos da API usados pelo front-end |
| [`aurora-design-reference/`](aurora-design-reference/) | Protótipos das telas e guia de design |

Quando houver divergência entre documentos, vale a ordem: especificação do módulo, PRD e ADR.

## Controle de versão

O projeto usa Git e GitHub:

- `main`: versão estável e entregue.
- `dev`: integração das funcionalidades.
- Branches de funcionalidade (por exemplo, `feature/...`) para cada entrega, integradas por pull request.


---

**Aurora — Mais clareza para cuidar das finanças em família.**
