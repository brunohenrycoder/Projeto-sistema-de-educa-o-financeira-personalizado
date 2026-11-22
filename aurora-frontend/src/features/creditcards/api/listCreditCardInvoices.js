import { request } from '../../../shared/api/client.js'

export function listCreditCardInvoices({ status } = {}) {
  const filtros = new URLSearchParams()

  if (status) filtros.set('status', status)

  const query = filtros.toString()
  return request(query ? `/credit-cards/invoices?${query}` : '/credit-cards/invoices', {
    method: 'GET',
  })
}
