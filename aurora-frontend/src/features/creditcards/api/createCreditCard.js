import { request } from '../../../shared/api/client.js'

export function createCreditCard({
  name,
  issuer,
  network,
  otherNetworkName,
  lastFourDigits,
  totalLimit,
  closingDay,
  dueDay,
}) {
  return request('/credit-cards', {
    method: 'POST',
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
