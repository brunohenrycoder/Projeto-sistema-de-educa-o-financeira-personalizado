CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expenses_family_group
        FOREIGN KEY (family_group_id) REFERENCES family_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_expenses_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_expenses_family_group_date
    ON expenses (family_group_id, expense_date DESC);

CREATE INDEX idx_expenses_family_group_user
    ON expenses (family_group_id, user_id, expense_date DESC);
