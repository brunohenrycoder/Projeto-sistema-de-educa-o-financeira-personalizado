import { request } from '../../../shared/api/client.js'

export function getSpendingPatterns({ month, category, memberId } = {}) {
  const filtros = new URLSearchParams()

  if (month) filtros.set('month', month)
  if (category) filtros.set('category', category)
  if (memberId) filtros.set('memberId', memberId)

  const query = filtros.toString()
  return request(query ? `/reports-analytics/patterns?${query}` : '/reports-analytics/patterns', {
    method: 'GET',
  })
}
