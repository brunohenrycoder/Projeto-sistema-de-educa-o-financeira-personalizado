CREATE TABLE financial_overview_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE RESTRICT,
    reference_month DATE NOT NULL,
    threshold_percent NUMERIC(5,2) NOT NULL CHECK (threshold_percent > 0),
    commitment_percent NUMERIC(7,2) NOT NULL CHECK (commitment_percent >= threshold_percent),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_financial_overview_alert_month_start
        CHECK (EXTRACT(DAY FROM reference_month) = 1),
    CONSTRAINT uk_financial_overview_alert_family_month_threshold
        UNIQUE (family_group_id, reference_month, threshold_percent)
);
