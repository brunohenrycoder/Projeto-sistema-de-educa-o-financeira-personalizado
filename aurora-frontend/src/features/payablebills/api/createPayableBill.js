import { request } from '../../../shared/api/client.js'

export function createPayableBill({ description, amount, dueDate, category, recurrence }) {
  return request('/payable-bills', {
    method: 'POST',
    body: { description, amount, dueDate, category, recurrence },
  })
}
