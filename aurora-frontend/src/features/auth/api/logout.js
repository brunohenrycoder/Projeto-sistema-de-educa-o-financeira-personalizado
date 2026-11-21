import { request } from '../../../shared/api/client.js'

export function logout() {
  return request('/auth/logout', {
    method: 'POST',
  })
}
