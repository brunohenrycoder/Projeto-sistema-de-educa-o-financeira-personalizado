import { request } from '../../../shared/api/client.js'

export function updateMember(memberId, { name, email }) {
  return request(`/familymanagement/members/${memberId}`, {
    method: 'PUT',
    body: { name, email },
  })
}
