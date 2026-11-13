-- RF-002: tentativas de login e sessões JWT revogáveis no servidor.

ALTER TABLE users
    DROP CONSTRAINT chk_users_status;

ALTER TABLE users
    ADD CONSTRAINT chk_users_status
    CHECK (status IN ('ATIVO', 'INATIVO', 'REMOVIDO'));

CREATE TABLE login_attempts (
    email_hash VARCHAR(64) PRIMARY KEY,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    last_failed_at TIMESTAMP,
    locked_until TIMESTAMP,
    CONSTRAINT chk_login_attempts_count CHECK (failed_attempts >= 0)
);

CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,

    CONSTRAINT fk_auth_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_auth_sessions_user ON auth_sessions (user_id);
CREATE INDEX idx_auth_sessions_expiration ON auth_sessions (expires_at);
