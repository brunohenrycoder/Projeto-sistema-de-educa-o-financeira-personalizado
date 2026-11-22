import { request } from '../../../shared/api/client.js'

export function cancelReceivable(receivableId, { scope }) {
  return request(`/receivables/${receivableId}/cancel`, {
    method: 'POST',
    body: { scope },
  })
}
