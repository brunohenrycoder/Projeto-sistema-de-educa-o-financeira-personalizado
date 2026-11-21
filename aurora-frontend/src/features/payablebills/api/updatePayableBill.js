import { request } from '../../../shared/api/client.js'

export function updatePayableBill(billId, { description, amount, dueDate, category }) {
  return request(`/payable-bills/${billId}`, {
    method: 'PUT',
    body: { description, amount, dueDate, category },
  })
}
