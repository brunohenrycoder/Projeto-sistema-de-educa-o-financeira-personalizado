import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { confirmEmail } from './confirmEmail.js'

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
})

describe('confirmEmail', () => {
  it('envia o token exclusivamente no corpo e aceita 204 sem corpo', async () => {
    const token = 'raw-token-de-teste'
    const fetchMock = mockFetch204()

    const result = await confirmEmail(token)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/auth/confirm-email')
    expect(url).not.toContain(token)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ token })
    expect(init.headers.has('Authorization')).toBe(false)
    expect(result).toBeNull()
  })
})
