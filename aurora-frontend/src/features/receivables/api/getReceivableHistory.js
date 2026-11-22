import { request } from '../../../shared/api/client.js'

export function getReceivableHistory(receivableId) {
  return request(`/receivables/${receivableId}/history`, {
    method: 'GET',
  })
}
