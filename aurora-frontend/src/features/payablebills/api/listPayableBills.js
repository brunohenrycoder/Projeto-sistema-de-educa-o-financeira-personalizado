import { request } from '../../../shared/api/client.js'

export function listPayableBills() {
  return request('/payable-bills', {
    method: 'GET',
  })
}
