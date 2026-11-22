import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearSession, hasRole, isSessionExpired, readSession, saveSession } from './session.js'

const SESSION_KEY = 'aurora.session'
const DADOS = {
  accessToken: 'jwt-de-teste',
  tokenType: 'Bearer',
  expiresIn: 3600,
  userId: 'u1',
  familyGroupId: 'f1',
  name: 'Ana Silva',
  email: 'ana@example.com',
  role: 'PRINCIPAL',
}

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  sessionStorage.clear()
})

describe('session', () => {
  it('saveSession persiste os campos e calcula expiresAt com base em expiresIn', () => {
    const antes = Date.now()
    const sessao = saveSession(DADOS)
    const depois = Date.now()

    expect(sessao).toMatchObject(DADOS)
    expect(sessao.expiresAt).toBeGreaterThanOrEqual(antes + 3_600_000)
    expect(sessao.expiresAt).toBeLessThanOrEqual(depois + 3_600_000)
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY))).toEqual(sessao)
  })

  it('saveSession rejeita dados sem accessToken válido', () => {
    expect(saveSession(null)).toBeNull()
    expect(saveSession(undefined)).toBeNull()
    expect(saveSession({ ...DADOS, accessToken: '' })).toBeNull()
    expect(saveSession({ ...DADOS, accessToken: 123 })).toBeNull()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('saveSession usa Bearer quando tokenType não é informado', () => {
    const sessao = saveSession({ ...DADOS, tokenType: undefined })
    expect(sessao.tokenType).toBe('Bearer')
  })

  it.each([undefined, 'abc', 0, -10])(
    'saveSession com expiresIn %p produz sessão imediatamente expirada',
    (expiresIn) => {
      const sessao = saveSession({ ...DADOS, expiresIn })

      expect(sessao.expiresIn).toBe(0)
      expect(sessao.expiresAt).toBeLessThanOrEqual(Date.now() + 1000)
      expect(isSessionExpired(sessao)).toBe(true)
    },
  )

  it('readSession retorna null quando não há sessão gravada', () => {
    expect(readSession()).toBeNull()
  })

  it('readSession retorna null para JSON corrompido', () => {
    sessionStorage.setItem(SESSION_KEY, '{')
    expect(readSession()).toBeNull()
  })

  it.each([
    JSON.stringify(null),
    JSON.stringify({}),
    JSON.stringify({ accessToken: 'jwt' }),
    JSON.stringify({ accessToken: 'jwt', expiresAt: 'abc' }),
  ])('readSession rejeita sessão inválida: %s', (raw) => {
    sessionStorage.setItem(SESSION_KEY, raw)
    expect(readSession()).toBeNull()
  })

  it('readSession recupera uma sessão válida gravada', () => {
    const sessao = saveSession(DADOS)
    expect(readSession()).toEqual(sessao)
  })

  it('clearSession remove a sessão do sessionStorage', () => {
    saveSession(DADOS)
    expect(sessionStorage.getItem(SESSION_KEY)).not.toBeNull()

    clearSession()

    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('isSessionExpired considera null como expirado', () => {
    expect(isSessionExpired(null)).toBe(true)
  })

  it('isSessionExpired distingue expiresAt passado e futuro', () => {
    expect(isSessionExpired({ expiresAt: Date.now() - 1000 })).toBe(true)
    expect(isSessionExpired({ expiresAt: Date.now() + 60_000 })).toBe(false)
  })

  it('hasRole verifica sessão e papel', () => {
    const sessao = { role: 'PRINCIPAL' }

    expect(hasRole(sessao, 'PRINCIPAL')).toBe(true)
    expect(hasRole(sessao, 'DEPENDENTE')).toBe(false)
    expect(hasRole(sessao, 'PRINCIPAL', 'DEPENDENTE')).toBe(true)
    expect(hasRole(null, 'PRINCIPAL')).toBe(false)
  })
})
