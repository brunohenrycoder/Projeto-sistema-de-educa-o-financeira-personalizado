import { request } from '../../../shared/api/client.js'

export function registerUser({ name, email, password, passwordConfirmation }) {
  return request('/auth/register', {
    method: 'POST',
    body: { name, email, password, passwordConfirmation },
  })
}
