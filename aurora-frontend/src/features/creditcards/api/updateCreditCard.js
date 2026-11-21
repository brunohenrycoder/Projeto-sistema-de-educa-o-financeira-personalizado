import { request } from '../../../shared/api/client.js'

export function updateCreditCard(cardId, {
  name,
  issuer,
  network,
  otherNetworkName,
  lastFourDigits,
  totalLimit,
  closingDay,
  dueDay,
}) {
  return request(`/credit-cards/${cardId}`, {
    method: 'PUT',
    body: {
      name,
      issuer,
      network,
      otherNetworkName,
      lastFourDigits,
      totalLimit,
      closingDay,
      dueDay,
    },
  })
}
