import { request } from '../../../shared/api/client.js'

export function listNotifications() {
  return request('/notifications', {
    method: 'GET',
  })
}
