import { request } from '../../../shared/api/client.js'

export function updateReceivableRecurrence(receivableId, {
  description,
  expectedAmount,
  nextExpectedDate,
  recurrenceDay,
}) {
  return request(`/receivables/${receivableId}/recurrence`, {
    method: 'PUT',
    body: { description, expectedAmount, nextExpectedDate, recurrenceDay },
  })
}
