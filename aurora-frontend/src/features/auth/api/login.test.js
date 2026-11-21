import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { login } from './login.js'

function mockFetch({ status, ok = status >= 200 && status < 300, payload = null }) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok,
    text: vi.fn().mockResolvedValue(payload === null ? '' : JSON.stringify(payload)),
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
  sessionStorage.clear()
})

describe('login', () => {
  it('envia POST com e-mail e senha e retorna a resposta achatada', async () => {
    const resposta = {
      accessToken: 'jwt-de-teste',
      tokenType: 'Bearer',
      expiresIn: 86400,
      userId: 'u1',
      familyGroupId: 'f1',
      name: 'Maria Silva',
      email: 'maria@example.com',
      role: 'PRINCIPAL',
    }
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await login({ email: 'maria@example.com', password: 'SenhaSegura123' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/auth/login')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      email: 'maria@example.com',
      password: 'SenhaSegura123',
    })
    expect(init.headers.has('Authorization')).toBe(false)
    expect(result).toEqual(resposta)
    expect(sessionStorage.getItem('aurora.session')).toBeNull()
  })
})
