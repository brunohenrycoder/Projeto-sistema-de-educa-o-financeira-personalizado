# Roles do PostgreSQL — Aurora

As migrations `V19__create_database_roles_and_grants.sql` criam duas **roles do banco de dados**, distintas dos perfis da aplicação (`PRINCIPAL` e `DEPENDENTE`, que são valores da coluna `users.role`):

| Role | Finalidade | Privilégios |
|---|---|---|
| `aurora_admin` | Administração da estrutura (DDL) | Dono das tabelas/views indicadas na migration; deve ser usada somente por operações administrativas e pelo Flyway |
| `aurora_app` | Execução da aplicação (DML) | `SELECT, INSERT, UPDATE, DELETE` nas tabelas do schema `public`, `USAGE` em sequências e no schema; **sem** `SUPERUSER`, `CREATEDB`, `CREATEROLE` e sem DDL |

## Criação segura de login/senha

As roles são criadas com `NOLOGIN` e **nenhuma senha é versionada**. Para habilitar conexão, um administrador deve executar separadamente, fora do repositório:

```sql
-- Executar como superusuário, em ambiente controlado:
ALTER ROLE aurora_app WITH LOGIN PASSWORD :'senha_app';
-- Se a aplicação também executar Flyway, habilite login na role administrativa:
ALTER ROLE aurora_admin WITH LOGIN PASSWORD :'senha_admin';
```

Use variáveis de ambiente (`psql -v senha_app=...`, cofres de segredos ou scripts administrativos) — nunca MACs, migrations ou arquivos versionados.

## Configuração da aplicação

A aplicação deve conectar com a role restrita `aurora_app`:

```properties
spring.datasource.username=${DB_USERNAME:aurora_app}
spring.datasource.password=${DB_PASSWORD}
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/aurora}
```

Os valores reais ficam em `.env` local (já carregado por `spring.config.import=optional:file:.env[.properties]`) ou variáveis de ambiente do servidor.

### Flyway

Se o Flyway for executado pela própria aplicação com `aurora_app`, a role **não tem permissão para DDL** e as migrations falharão. Nesse caso, execute as migrations com `aurora_admin` antes de iniciar a aplicação (etapa de deploy), e mantenha `spring.flyway.enabled=false` no runtime da aplicação — ou conceda DDL apenas no usuário de deploy, nunca no de runtime.

```properties
# Runtime da aplicação
spring.flyway.enabled=false
```

> Para o ambiente acadêmico atual, o projeto segue com `postgres` em `application.properties` e o Flyway habilitado. Esta documentação descreve como migrar para o modelo de menor privilégio sem alterar regras de negócio.
