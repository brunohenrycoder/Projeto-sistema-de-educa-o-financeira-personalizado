import { request } from '../../../shared/api/client.js'

export function getSavingsSuggestion() {
  return request('/financial-goals/savings-suggestion', {
    method: 'GET',
  })
}
