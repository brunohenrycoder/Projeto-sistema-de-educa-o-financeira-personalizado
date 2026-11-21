import { request } from '../../../shared/api/client.js'

export function confirmReceivable(receivableId, { receivedDate, amount }) {
  return request(`/receivables/${receivableId}/confirm`, {
    method: 'POST',
    body: {
      receivedDate,
      ...(amount !== undefined && amount !== null ? { amount } : {}),
    },
  })
}
