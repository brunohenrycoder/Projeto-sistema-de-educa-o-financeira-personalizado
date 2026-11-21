import { request } from '../../../shared/api/client.js'

export function listMembers() {
  return request('/familymanagement/members', {
    method: 'GET',
  })
}
