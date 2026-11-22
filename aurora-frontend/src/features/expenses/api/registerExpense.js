import { request } from '../../../shared/api/client.js'

export function registerExpense({
  amount,
  expenseDate,
  category,
  paymentMethod,
  description,
  installmentCount,
}) {
  return request('/expenses', {
    method: 'POST',
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
