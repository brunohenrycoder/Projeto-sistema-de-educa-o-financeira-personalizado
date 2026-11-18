const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value) {
  const numero = Number(value)
  if (!Number.isFinite(numero)) return ''
  return formatter.format(numero)
}

function validarGruposMilhar(parteInteira) {
  if (!parteInteira.includes('.')) {
    return /^\d+$/.test(parteInteira) ? parteInteira : null
  }

  const grupos = parteInteira.split('.')
  if (!/^\d{1,3}$/.test(grupos[0])) return null

  for (let indice = 1; indice < grupos.length; indice += 1) {
    if (!/^\d{3}$/.test(grupos[indice])) return null
  }

  return grupos.join('')
}

export function parseCurrencyInput(input) {
  if (input === null || input === undefined) return null

  const original = String(input).trim()
  if (!original) return null

  const semMoeda = original.replace(/R\$/gi, '').replace(/\s+/g, '')
  if (!/^[+-]?[\d.,]*$/.test(semMoeda)) return null

  const negativo = semMoeda.startsWith('-')
  const corpo = semMoeda.replace(/^[+-]/, '')

  if (!corpo || /^[.,]|[.,]$/.test(corpo) || /[.,]{2,}/.test(corpo)) return null

  const partes = corpo.split(',')
  if (partes.length > 2) return null

  const parteInteira = partes[0]
  const parteDecimal = partes.length === 2 ? partes[1] : null

  if (parteDecimal !== null && !/^\d{1,2}$/.test(parteDecimal)) return null

  const inteiro = validarGruposMilhar(parteInteira)
  if (inteiro === null) return null

  const numero = Number(parteDecimal === null ? inteiro : `${inteiro}.${parteDecimal}`)
  if (!Number.isFinite(numero)) return null

  return negativo ? -numero : numero
}
