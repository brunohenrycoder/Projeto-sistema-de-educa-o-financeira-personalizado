-- Atualiza automaticamente expenses.updated_at em operações de UPDATE.
-- A coluna updated_at já existe desde V5 e a entidade Expense também a atualiza
-- via @PreUpdate; a trigger garante a consistência mesmo para updates fora da aplicação.

CREATE OR REPLACE FUNCTION set_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expenses_set_updated_at ON expenses;

CREATE TRIGGER trg_expenses_set_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION set_expenses_updated_at();
