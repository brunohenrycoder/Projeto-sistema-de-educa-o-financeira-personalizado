import { request } from '../../../shared/api/client.js'

export function registerCreditCardRefund(expenseId, { amount }) {
  return request(`/credit-cards/expenses/${expenseId}/refunds`, {
    method: 'POST',
    body: { amount },
  })
}
