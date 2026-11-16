ALTER TABLE payable_bill_series
    ALTER COLUMN recurrence_day TYPE INTEGER USING recurrence_day::INTEGER;
