import { request } from '../../../shared/api/client.js'

export function cancelPayableBill(billId, { scope }) {
  return request(`/payable-bills/${billId}/cancel`, {
    method: 'POST',
    body: { scope },
  })
}
