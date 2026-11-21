import { request } from '../../../shared/api/client.js'

export function deactivateCreditCard(cardId) {
  return request(`/credit-cards/${cardId}`, {
    method: 'DELETE',
  })
}
