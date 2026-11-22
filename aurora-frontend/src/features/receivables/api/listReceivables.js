import { request } from '../../../shared/api/client.js'

export function listReceivables() {
  return request('/receivables', {
    method: 'GET',
  })
}
