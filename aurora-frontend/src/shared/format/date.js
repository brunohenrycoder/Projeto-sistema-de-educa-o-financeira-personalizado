export function formatDate(value) {
  if (!value) return ''

  const iso = typeof value === 'string' ? value.slice(0, 10) : null
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''

  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function toApiMonth(value) {
  if (!value) return ''

  if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7)

  return ''
}
