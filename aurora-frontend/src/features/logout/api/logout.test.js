import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { logout } from './logout.js'

function mockFetch204() {
  const fn = vi.fn().mockResolvedValue({
    status: 204,
    ok: true,
    text: vi.fn().mockResolvedValue(''),
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
  sessionStorage.clear()
})

describe('logout', () => {
  it('envia POST com Bearer do provedor central e aceita 204 sem limpar a sessão', async () => {
    sessionStorage.setItem('aurora.session', 'sessao-preservada-pelo-servico')
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch204()

    const result = await logout()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/auth/logout')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(init.body).toBeUndefined()
    expect(result).toBeNull()
    expect(sessionStorage.getItem('aurora.session')).toBe('sessao-preservada-pelo-servico')
  })
})
