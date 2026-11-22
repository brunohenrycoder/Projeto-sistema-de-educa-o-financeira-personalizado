import { request } from '../../../shared/api/client.js'

export function deleteExpense(expenseId) {
  return request(`/expenses/${expenseId}`, {
    method: 'DELETE',
  })
}
