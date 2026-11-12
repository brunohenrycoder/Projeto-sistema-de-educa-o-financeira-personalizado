-- V2: Adiciona confirmação de e-mail para usuários e tabela de tokens de confirmação
-- Requisitos: RF-001 (Confirmação de e-mail do Principal)

ALTER TABLE users
    ADD COLUMN email_confirmed BOOLEAN NOT NULL DEFAULT TRUE;

-- Contas já existentes são preservadas; novos cadastros aguardam confirmação.
ALTER TABLE users
    ALTER COLUMN email_confirmed SET DEFAULT FALSE;

CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_email_verification_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uk_email_verification_tokens_hash
    ON email_verification_tokens (token_hash);

CREATE INDEX idx_email_verification_tokens_user
    ON email_verification_tokens (user_id);
