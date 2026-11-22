CREATE TABLE payable_bill_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE RESTRICT,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(30) NOT NULL CHECK (
        category IN ('MORADIA', 'ALIMENTACAO', 'TRANSPORTE', 'SAUDE', 'EDUCACAO',
                     'LAZER', 'CONTAS_CONSUMO', 'ASSINATURAS', 'IMPOSTOS', 'OUTROS')
    ),
    recurrence VARCHAR(30) NOT NULL CHECK (recurrence IN ('SEM_RECORRENCIA', 'MENSAL')),
    next_due_date DATE NOT NULL,
    next_occurrence_number INTEGER NOT NULL CHECK (next_occurrence_number >= 2),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payable_bill_series_family
    ON payable_bill_series (family_group_id, active);

CREATE TABLE payable_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE RESTRICT,
    series_id UUID NOT NULL REFERENCES payable_bill_series(id) ON DELETE RESTRICT,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    cancelled_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    occurrence_number INTEGER NOT NULL CHECK (occurrence_number >= 1),
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (
        category IN ('MORADIA', 'ALIMENTACAO', 'TRANSPORTE', 'SAUDE', 'EDUCACAO',
                     'LAZER', 'CONTAS_CONSUMO', 'ASSINATURAS', 'IMPOSTOS', 'OUTROS')
    ),
    recurrence VARCHAR(30) NOT NULL CHECK (recurrence IN ('SEM_RECORRENCIA', 'MENSAL')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDENTE', 'PAGA', 'ATRASADA', 'CANCELADA')),
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_payable_bill_occurrence UNIQUE (series_id, occurrence_number)
);

CREATE INDEX idx_payable_bills_family_due_date
    ON payable_bills (family_group_id, due_date);
CREATE INDEX idx_payable_bills_overdue
    ON payable_bills (due_date) WHERE status = 'PENDENTE';

CREATE TABLE payable_bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL UNIQUE REFERENCES payable_bills(id) ON DELETE RESTRICT,
    expense_id UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE RESTRICT,
    paid_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payable_bill_payment_method CHECK (
        payment_method IN ('DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'TRANSFERENCIA', 'OUTRO')
    )
);

CREATE TABLE payable_bill_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES payable_bills(id) ON DELETE RESTRICT,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDENTE', 'PAGA', 'ATRASADA', 'CANCELADA')),
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payable_bill_status_history_bill
    ON payable_bill_status_history (bill_id, changed_at);
