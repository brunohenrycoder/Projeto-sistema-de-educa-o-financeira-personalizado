import { request } from '../../../shared/api/client.js'
import { toApiMonth } from '../../../shared/format/date.js'

export function getFinancialOverview({ month } = {}) {
  const filtros = new URLSearchParams()
  const mes = toApiMonth(month)

  if (mes) filtros.set('month', mes)

  const query = filtros.toString()
  return request(query ? `/financial-overview?${query}` : '/financial-overview', {
    method: 'GET',
  })
}
