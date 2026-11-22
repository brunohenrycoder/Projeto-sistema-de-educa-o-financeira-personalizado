import { request } from '../../../shared/api/client.js'

export function createReceivable({ description, expectedAmount, expectedDate, recurrence }) {
  return request('/receivables', {
    method: 'POST',
    body: { description, expectedAmount, expectedDate, recurrence },
  })
}
