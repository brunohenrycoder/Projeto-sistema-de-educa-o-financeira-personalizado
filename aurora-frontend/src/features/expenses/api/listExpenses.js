import { request } from '../../../shared/api/client.js'

export function listExpenses({ startDate, endDate, category, memberId } = {}) {
  const filtros = new URLSearchParams()

  if (startDate) filtros.set('startDate', startDate)
  if (endDate) filtros.set('endDate', endDate)
  if (category) filtros.set('category', category)
  if (memberId) filtros.set('memberId', memberId)

  const query = filtros.toString()
  return request(query ? `/expenses?${query}` : '/expenses', {
    method: 'GET',
  })
}
