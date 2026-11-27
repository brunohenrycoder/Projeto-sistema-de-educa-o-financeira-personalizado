-- Roles de banco de dados para separação de responsabilidades.
-- NÃO são os perfis da aplicação (PRINCIPAL/DEPENDENTE da tabela users).
-- Nenhuma senha é versionada: a criação de login/senha deve ser feita por
-- script administrativo externo ou variável de ambiente (ver README/Guia).

-- Role administrativa: dona dos objetos e responsável por DDL.
-- A senha deve ser definida fora do controle de versão, se login for necessário.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aurora_admin') THEN
        CREATE ROLE aurora_admin NOLOGIN;
    END IF;
END
$$;

-- Role de aplicação: somente DML nas tabelas de negócio e leitura das views.
-- Sem CREATEDB, CREATEROLE, SUPERUSER e sem DDL.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aurora_app') THEN
        CREATE ROLE aurora_app NOLOGIN;
    END IF;
END
$$;

-- A aplicação executa DML nas tabelas do domínio.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aurora_app;

-- A aplicação utiliza sequências/valores padrão das tabelas (gen_random_uuid()
-- não depende de sequência, mas o grant cobre objetos futuros com DEFAULT).
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO aurora_app;

-- A aplicação pode usar o schema, mas não criar/alterar objetos.
GRANT USAGE ON SCHEMA public TO aurora_app;

-- Privilégios padrão para objetos criados pela role administrativa:
-- a aplicação recebe DML automaticamente; DDL permanece restrito ao admin.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aurora_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO aurora_app;

-- A role administrativa é a dona dos objetos criados pelas migrations seguintes.
-- Os objetos já existentes permanecem com seu owner atual para não quebrar o Flyway.
ALTER TABLE expenses OWNER TO aurora_admin;
ALTER VIEW vw_expense_summary_by_category OWNER TO aurora_admin;
