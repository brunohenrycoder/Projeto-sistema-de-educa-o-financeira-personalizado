import { request } from '../../../shared/api/client.js'

export function acceptInvite({ token, email, name, password, passwordConfirmation }) {
  return request('/familymanagement/accept-invite', {
    method: 'POST',
    body: { token, email, name, password, passwordConfirmation },
  })
}
