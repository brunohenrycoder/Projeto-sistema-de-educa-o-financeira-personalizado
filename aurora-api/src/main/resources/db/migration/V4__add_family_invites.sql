CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE family_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL,
    created_by_user_id UUID NULL,
    accepted_by_user_id UUID NULL,
    invited_email VARCHAR(200) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP NULL,
    invalidated_at TIMESTAMP NULL,
    CONSTRAINT fk_family_invites_family_group
        FOREIGN KEY (family_group_id) REFERENCES family_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_family_invites_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_family_invites_accepted_by
        FOREIGN KEY (accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_family_invites_token_hash ON family_invites (token_hash);
CREATE INDEX idx_family_invites_family_group ON family_invites (family_group_id);
CREATE INDEX idx_family_invites_email_status ON family_invites (family_group_id, invited_email, status);
