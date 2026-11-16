CREATE TABLE receivable_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE RESTRICT,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    expected_amount NUMERIC(12,2) NOT NULL CHECK (expected_amount > 0),
    recurrence VARCHAR(30) NOT NULL CHECK (recurrence IN ('SEM_RECORRENCIA', 'MENSAL')),
    next_expected_date DATE NOT NULL,
    next_occurrence_number INTEGER NOT NULL CHECK (next_occurrence_number >= 2),
    recurrence_day INTEGER NOT NULL CHECK (recurrence_day BETWEEN 1 AND 31),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receivable_series_family_active
    ON receivable_series (family_group_id, active);

CREATE TABLE receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE RESTRICT,
    series_id UUID NOT NULL REFERENCES receivable_series(id) ON DELETE RESTRICT,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    cancelled_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    occurrence_number INTEGER NOT NULL CHECK (occurrence_number >= 1),
    description VARCHAR(255) NOT NULL,
    expected_amount NUMERIC(12,2) NOT NULL CHECK (expected_amount > 0),
    expected_date DATE NOT NULL,
    recurrence VARCHAR(30) NOT NULL CHECK (recurrence IN ('SEM_RECORRENCIA', 'MENSAL')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDENTE', 'RECEBIDA', 'ATRASADA', 'CANCELADA')),
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_receivable_occurrence UNIQUE (series_id, occurrence_number)
);

CREATE INDEX idx_receivables_family_expected_date
    ON receivables (family_group_id, expected_date);
CREATE INDEX idx_receivables_family_status_date
    ON receivables (family_group_id, status, expected_date);
CREATE INDEX idx_receivables_overdue
    ON receivables (expected_date) WHERE status = 'PENDENTE';

CREATE TABLE receivable_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL UNIQUE REFERENCES receivables(id) ON DELETE RESTRICT,
    received_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    received_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE receivable_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE RESTRICT,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    previous_status VARCHAR(20) CHECK (
        previous_status IS NULL OR previous_status IN ('PENDENTE', 'RECEBIDA', 'ATRASADA', 'CANCELADA')
    ),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDENTE', 'RECEBIDA', 'ATRASADA', 'CANCELADA')),
    previous_description VARCHAR(255),
    description VARCHAR(255) NOT NULL,
    previous_expected_amount NUMERIC(12,2) CHECK (
        previous_expected_amount IS NULL OR previous_expected_amount > 0
    ),
    expected_amount NUMERIC(12,2) NOT NULL CHECK (expected_amount > 0),
    previous_expected_date DATE,
    expected_date DATE NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receivable_history_receivable_changed
    ON receivable_history (receivable_id, changed_at);
