import { request } from '../../../shared/api/client.js'

export function updateReceivable(receivableId, { description, expectedAmount, expectedDate }) {
  return request(`/receivables/${receivableId}`, {
    method: 'PUT',
    body: { description, expectedAmount, expectedDate },
  })
}
