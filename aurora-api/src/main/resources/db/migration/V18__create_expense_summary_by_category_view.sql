-- Resumo de despesas válidas por categoria.
-- Despesas CANCELADO são excluídas conforme chk_expenses_cancellation (V6).

CREATE OR REPLACE VIEW vw_expense_summary_by_category AS
SELECT
    e.category AS category,
    COUNT(*) AS expense_count,
    SUM(e.amount) AS total_amount
FROM expenses e
WHERE e.status = 'ATIVO'
  AND e.cancelled_at IS NULL
  AND e.cancelled_by_user_id IS NULL
GROUP BY e.category
ORDER BY e.category;
