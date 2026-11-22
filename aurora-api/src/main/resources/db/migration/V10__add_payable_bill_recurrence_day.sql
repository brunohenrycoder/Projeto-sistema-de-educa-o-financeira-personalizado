ALTER TABLE payable_bill_series
    ADD COLUMN recurrence_day SMALLINT;

UPDATE payable_bill_series series
SET recurrence_day = EXTRACT(DAY FROM bill.due_date)::SMALLINT
FROM payable_bills bill
WHERE bill.series_id = series.id
  AND bill.occurrence_number = 1;

ALTER TABLE payable_bill_series
    ALTER COLUMN recurrence_day SET NOT NULL,
    ADD CONSTRAINT chk_payable_bill_recurrence_day CHECK (recurrence_day BETWEEN 1 AND 31);
