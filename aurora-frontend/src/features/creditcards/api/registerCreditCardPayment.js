import { request } from '../../../shared/api/client.js'

export function registerCreditCardPayment(invoiceId, { amount }) {
  return request(`/credit-cards/invoices/${invoiceId}/payments`, {
    method: 'POST',
    body: { amount },
  })
}
