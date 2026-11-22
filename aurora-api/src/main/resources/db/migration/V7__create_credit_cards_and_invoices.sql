CREATE TABLE credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    issuer VARCHAR(100) NOT NULL,
    network VARCHAR(30) NOT NULL,
    other_network_name VARCHAR(40),
    last_four_digits VARCHAR(4),
    total_limit NUMERIC(12,2) NOT NULL CHECK (total_limit > 0),
    closing_day SMALLINT NOT NULL CHECK (closing_day BETWEEN 1 AND 28),
    due_day SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 28),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_credit_card_network
        CHECK (network IN ('VISA', 'MASTERCARD', 'ELO', 'AMERICAN_EXPRESS', 'HIPERCARD', 'OUTRA')),
    CONSTRAINT chk_credit_card_other_network
        CHECK (
            (network = 'OUTRA' AND other_network_name IS NOT NULL
                AND CHAR_LENGTH(TRIM(other_network_name)) BETWEEN 2 AND 40)
            OR (network <> 'OUTRA' AND other_network_name IS NULL)
        ),
    CONSTRAINT chk_credit_card_last_four_digits
        CHECK (last_four_digits IS NULL OR last_four_digits ~ '^[0-9]{4}$')
);

CREATE UNIQUE INDEX uk_credit_cards_one_active_per_family
    ON credit_cards (family_group_id) WHERE active;

CREATE TABLE credit_card_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE RESTRICT,
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE RESTRICT,
    cycle_start DATE NOT NULL,
    closing_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_credit_card_invoice_cycle UNIQUE (credit_card_id, cycle_start),
    CONSTRAINT chk_credit_card_invoice_status
        CHECK (status IN ('OPEN', 'CLOSED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE')),
    CONSTRAINT chk_credit_card_invoice_dates CHECK (due_date > closing_date),
    CONSTRAINT chk_credit_card_invoice_balance
        CHECK (paid_amount + credit_amount <= total_amount)
);

CREATE INDEX idx_credit_card_invoices_family_due
    ON credit_card_invoices (family_group_id, due_date, status);

CREATE TABLE credit_card_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES credit_card_invoices(id) ON DELETE RESTRICT,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE RESTRICT,
    installment_number SMALLINT NOT NULL CHECK (installment_number BETWEEN 1 AND 36),
    installment_count SMALLINT NOT NULL CHECK (installment_count BETWEEN 1 AND 36),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0.01),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
    credited_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credited_amount >= 0),
    cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_credit_card_installment_number
        CHECK (installment_number <= installment_count),
    CONSTRAINT chk_credit_card_installment_balance
        CHECK (paid_amount + refunded_amount + credited_amount <= amount)
);

CREATE UNIQUE INDEX uk_credit_card_active_expense_installment
    ON credit_card_installments (expense_id, installment_number) WHERE cancelled = FALSE;

CREATE INDEX idx_credit_card_installments_invoice
    ON credit_card_installments (invoice_id, installment_number);

CREATE TABLE credit_card_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES credit_card_invoices(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_card_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES credit_card_payments(id) ON DELETE RESTRICT,
    installment_id UUID NOT NULL REFERENCES credit_card_installments(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0)
);

CREATE INDEX idx_credit_card_payment_allocations_installment
    ON credit_card_payment_allocations (installment_id);

CREATE TABLE credit_card_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE RESTRICT,
    card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_card_refunds_expense ON credit_card_refunds (expense_id);

CREATE TABLE credit_card_refund_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id UUID NOT NULL REFERENCES credit_card_refunds(id) ON DELETE RESTRICT,
    installment_id UUID NOT NULL REFERENCES credit_card_installments(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0)
);

CREATE TABLE credit_card_refund_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id UUID NOT NULL UNIQUE REFERENCES credit_card_refunds(id) ON DELETE RESTRICT,
    card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    remaining_amount NUMERIC(12,2) NOT NULL CHECK (remaining_amount >= 0),
    CONSTRAINT chk_credit_card_refund_credit_remaining CHECK (remaining_amount <= amount)
);

CREATE INDEX idx_credit_card_refund_credits_pending
    ON credit_card_refund_credits (card_id, remaining_amount) WHERE remaining_amount > 0;

CREATE TABLE credit_card_credit_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id UUID NOT NULL REFERENCES credit_card_refund_credits(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES credit_card_invoices(id) ON DELETE RESTRICT,
    installment_id UUID NOT NULL REFERENCES credit_card_installments(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_card_credit_applications_invoice
    ON credit_card_credit_applications (invoice_id);
