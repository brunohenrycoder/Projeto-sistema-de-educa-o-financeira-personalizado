import { request } from '../../../shared/api/client.js'

export function removeMember(memberId) {
  return request(`/familymanagement/members/${memberId}`, {
    method: 'DELETE',
  })
}
