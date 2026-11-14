ALTER TABLE expenses
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    ADD COLUMN cancelled_by_user_id UUID,
    ADD COLUMN cancelled_at TIMESTAMP,
    ADD CONSTRAINT chk_expenses_status
        CHECK (status IN ('ATIVO', 'CANCELADO')),
    ADD CONSTRAINT fk_expenses_cancelled_by
        FOREIGN KEY (cancelled_by_user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE expenses
    DROP CONSTRAINT fk_expenses_user,
    ADD CONSTRAINT fk_expenses_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    DROP CONSTRAINT fk_expenses_family_group,
    ADD CONSTRAINT fk_expenses_family_group
        FOREIGN KEY (family_group_id) REFERENCES family_groups(id) ON DELETE RESTRICT;

ALTER TABLE expenses
    ADD CONSTRAINT chk_expenses_cancellation
        CHECK (
            (status = 'ATIVO' AND cancelled_by_user_id IS NULL AND cancelled_at IS NULL)
            OR (status = 'CANCELADO' AND cancelled_by_user_id IS NOT NULL AND cancelled_at IS NOT NULL)
        );

CREATE INDEX idx_expenses_family_group_status_date
    ON expenses (family_group_id, status, expense_date DESC);
