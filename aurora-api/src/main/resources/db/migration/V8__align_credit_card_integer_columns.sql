ALTER TABLE credit_cards
    ALTER COLUMN closing_day TYPE INTEGER USING closing_day::INTEGER,
    ALTER COLUMN due_day TYPE INTEGER USING due_day::INTEGER;

ALTER TABLE credit_card_installments
    ALTER COLUMN installment_number TYPE INTEGER USING installment_number::INTEGER,
    ALTER COLUMN installment_count TYPE INTEGER USING installment_count::INTEGER;
