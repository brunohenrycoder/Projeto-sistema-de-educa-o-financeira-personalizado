import { request } from '../../../shared/api/client.js'

export function updatePayableBillRecurrence(billId, { description, amount, category, nextDueDate }) {
  return request(`/payable-bills/${billId}/recurrence`, {
    method: 'PUT',
    body: { description, amount, category, nextDueDate },
  })
}
