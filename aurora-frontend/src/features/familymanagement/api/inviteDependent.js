import { request } from '../../../shared/api/client.js'

export function inviteDependent({ email }) {
  return request('/familymanagement/invite', {
    method: 'POST',
    body: { email },
  })
}
