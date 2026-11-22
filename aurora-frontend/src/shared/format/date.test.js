import { describe, expect, it } from 'vitest'
import { formatDate, toApiMonth } from './date.js'

describe('formatação de datas', () => {
  it('formata ISO para dd/MM/aaaa', () => {
    expect(formatDate('2026-11-18')).toBe('18/11/2026')
  })

  it('rejeita datas inválidas', () => {
    expect(formatDate('18/11/2026')).toBe('')
  })

  it('extrai o mês no formato AAAA-MM', () => {
    expect(toApiMonth('2026-11-18')).toBe('2026-11')
    expect(toApiMonth('2026-11')).toBe('2026-11')
  })
})
