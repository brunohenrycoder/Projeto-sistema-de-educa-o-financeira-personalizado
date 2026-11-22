import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { removeMember } from './removeMember.js'

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

describe('removeMember', () => {
  it('envia DELETE com o memberId na URL, o Bearer central e aceita 204 sem corpo', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch204()

    const result = await removeMember('u1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/familymanagement/members/u1')
    expect(init.method).toBe('DELETE')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(init.body).toBeUndefined()
    expect(result).toBeNull()
  })

  it('propaga ApiError com todas as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fn = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        status: 404,
        erro: 'Integrante não encontrado',
        mensagens: ['Integrante não encontrado no grupo familiar.'],
        caminho: '/api/familymanagement/members/u1',
      })),
    })
    vi.stubGlobal('fetch', fn)

    await expect(removeMember('u1')).rejects.toMatchObject({
      status: 404,
      messages: ['Integrante não encontrado no grupo familiar.'],
    })
  })
})
