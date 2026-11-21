import { request } from '../../../shared/api/client.js'

export function confirmEmail(token) {
  return request('/auth/confirm-email', {
    method: 'POST',
    body: { token },
  })
}
