CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE RESTRICT,
    notification_type VARCHAR(40) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    reference_month DATE,
    threshold_percent NUMERIC(5,2),
    commitment_percent NUMERIC(12,2),
    payable_bill_id UUID REFERENCES payable_bills(id) ON DELETE RESTRICT,
    notification_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_notifications_reference_month_start
        CHECK (reference_month IS NULL OR EXTRACT(DAY FROM reference_month) = 1),
    CONSTRAINT chk_notifications_type_data CHECK (
        (
            notification_type = 'ALERTA_DESPESAS'
            AND reference_month IS NOT NULL
            AND threshold_percent = 80
            AND commitment_percent >= threshold_percent
            AND payable_bill_id IS NULL
            AND notification_date IS NULL
        )
        OR
        (
            notification_type = 'LEMBRETE_VENCIMENTO'
            AND reference_month IS NULL
            AND threshold_percent IS NULL
            AND commitment_percent IS NULL
            AND payable_bill_id IS NOT NULL
            AND notification_date IS NOT NULL
        )
    )
);

CREATE UNIQUE INDEX uk_notifications_expense_alert
    ON notifications (family_group_id, notification_type, reference_month, threshold_percent)
    WHERE reference_month IS NOT NULL;

CREATE UNIQUE INDEX uk_notifications_payable_reminder
    ON notifications (family_group_id, notification_type, payable_bill_id, notification_date)
    WHERE payable_bill_id IS NOT NULL;

CREATE INDEX idx_notifications_family_created
    ON notifications (family_group_id, created_at DESC);

INSERT INTO notifications (
    id, family_group_id, notification_type, description,
    reference_month, threshold_percent, commitment_percent, created_at
)
SELECT
    id,
    family_group_id,
    'ALERTA_DESPESAS',
    'As despesas familiares atingiram ' || commitment_percent::text
        || '% da renda no período; o limite é 80%.',
    reference_month,
    threshold_percent,
    commitment_percent,
    created_at
FROM financial_overview_alerts;

DROP TABLE financial_overview_alerts;
