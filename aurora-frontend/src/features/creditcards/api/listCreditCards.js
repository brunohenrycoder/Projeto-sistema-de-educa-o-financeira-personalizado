import { request } from '../../../shared/api/client.js'

export function listCreditCards() {
  return request('/credit-cards', {
    method: 'GET',
  })
}
