import { request } from '../../../shared/api/client.js'

export function getExpensesByCategory({ startDate, endDate, category, memberId } = {}) {
  const filtros = new URLSearchParams()

  if (startDate) filtros.set('startDate', startDate)
  if (endDate) filtros.set('endDate', endDate)
  if (category) filtros.set('category', category)
  if (memberId) filtros.set('memberId', memberId)

  const query = filtros.toString()
  return request(query ? `/reports-analytics/expenses/by-category?${query}` : '/reports-analytics/expenses/by-category', {
    method: 'GET',
  })
}
