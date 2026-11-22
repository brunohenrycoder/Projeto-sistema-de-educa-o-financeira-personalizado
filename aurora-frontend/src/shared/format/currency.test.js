import { describe, expect, it } from 'vitest'
import { formatCurrency, parseCurrencyInput } from './currency.js'

describe('formatação monetária', () => {
  it('formata valores em reais', () => {
    expect(formatCurrency(1250)).toContain('R$')
    expect(formatCurrency(1250)).toContain('1.250,00')
  })

  it('não formata valores inválidos', () => {
    expect(formatCurrency('abc')).toBe('')
  })

  it('interpreta ponto como separador de milhar', () => {
    expect(parseCurrencyInput('R$ 1.250,00')).toBe(1250)
    expect(parseCurrencyInput('1.250')).toBe(1250)
    expect(parseCurrencyInput('1.250.000')).toBe(1250000)
    expect(parseCurrencyInput('42.500,00')).toBe(42500)
  })

  it('interpreta vírgula como separador decimal', () => {
    expect(parseCurrencyInput('1250,50')).toBe(1250.5)
    expect(parseCurrencyInput('42,50')).toBe(42.5)
  })

  it('preserva o sinal', () => {
    expect(parseCurrencyInput('-1.250,00')).toBe(-1250)
    expect(parseCurrencyInput('+45,90')).toBe(45.9)
  })

  it('rejeita entradas vazias ou com caracteres indevidos', () => {
    expect(parseCurrencyInput('')).toBeNull()
    expect(parseCurrencyInput('abc')).toBeNull()
    expect(parseCurrencyInput('12a34')).toBeNull()
  })

  it('rejeita separadores incorretos e casos ambíguos', () => {
    expect(parseCurrencyInput('1,250')).toBeNull()
    expect(parseCurrencyInput('1.25')).toBeNull()
    expect(parseCurrencyInput('12.3456')).toBeNull()
    expect(parseCurrencyInput('1..250')).toBeNull()
    expect(parseCurrencyInput('1.250,000')).toBeNull()
    expect(parseCurrencyInput('1,25.000')).toBeNull()
    expect(parseCurrencyInput('.500')).toBeNull()
    expect(parseCurrencyInput('500,')).toBeNull()
  })
})
