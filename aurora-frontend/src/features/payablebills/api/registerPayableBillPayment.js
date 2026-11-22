import { request } from '../../../shared/api/client.js'

export function registerPayableBillPayment(billId, { paymentDate, paymentMethod, amount }) {
  return request(`/payable-bills/${billId}/payments`, {
    method: 'POST',
    body: { paymentDate, paymentMethod, amount },
  })
}
