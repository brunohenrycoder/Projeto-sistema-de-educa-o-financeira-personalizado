-- V1: Criação dos grupos familiares e usuários
-- Requisitos: RF-001 e preparação para RF-003

CREATE TABLE family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_family_group
        FOREIGN KEY (family_group_id)
        REFERENCES family_groups(id),

    CONSTRAINT chk_users_role
        CHECK (role IN ('PRINCIPAL', 'DEPENDENTE')),

    CONSTRAINT chk_users_status
        CHECK (status IN ('ATIVO', 'REMOVIDO')),

    CONSTRAINT chk_users_name_length
        CHECK (CHAR_LENGTH(TRIM(name)) >= 3)
);

-- E-mail único, sem diferenciar maiúsculas de minúsculas.
CREATE UNIQUE INDEX uk_users_email_lower
    ON users (LOWER(email));

-- Consultas por família (listar membros e isolamento entre famílias).
CREATE INDEX idx_users_family_group
    ON users (family_group_id);

-- Garante que cada grupo tenha somente um usuário PRINCIPAL.
-- Revisar se o cliente aceitar mais de um principal (por exemplo, um casal).
CREATE UNIQUE INDEX uk_users_one_principal_per_family
    ON users (family_group_id)
    WHERE role = 'PRINCIPAL';