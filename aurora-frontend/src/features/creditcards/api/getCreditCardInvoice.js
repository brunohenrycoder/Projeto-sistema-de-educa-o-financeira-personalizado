import { request } from '../../../shared/api/client.js'

export function getCreditCardInvoice(invoiceId) {
  return request(`/credit-cards/invoices/${invoiceId}`, {
    method: 'GET',
  })
}
