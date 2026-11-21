import { request } from '../../../shared/api/client.js'

export function confirmGoal({ targetAmount }) {
  return request('/financial-goals/confirm', {
    method: 'POST',
    body: { targetAmount },
  })
}
