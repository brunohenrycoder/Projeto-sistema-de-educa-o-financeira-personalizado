import { request } from '../../../shared/api/client.js'

export function listPayableBillPayments(billId) {
  return request(`/payable-bills/${billId}/payments`, {
    method: 'GET',
  })
}
