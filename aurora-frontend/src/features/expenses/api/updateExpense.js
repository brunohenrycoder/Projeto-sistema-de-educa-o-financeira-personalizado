import { request } from '../../../shared/api/client.js'

export function updateExpense(expenseId, {
  amount,
  expenseDate,
  category,
  paymentMethod,
  description,
  installmentCount,
}) {
  return request(`/expenses/${expenseId}`, {
    method: 'PUT',
    body: {
      amount,
      expenseDate,
      category,
      paymentMethod,
      description,
      installmentCount,
    },
  })
}
