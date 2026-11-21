import { request } from '../../../shared/api/client.js'

export function listGoals() {
  return request('/financial-goals', {
    method: 'GET',
  })
}
