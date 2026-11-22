import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { listMembers } from './listMembers.js'

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

describe('listMembers', () => {
  it('envia GET com o Bearer do provedor central e retorna a lista de membros', async () => {
    const resposta = [{
      id: 'u1',
      name: 'Pedro Silva',
      email: 'filho@example.com',
      role: 'DEPENDENTE',
      status: 'ATIVO',
      createdAt: '2026-11-18T10:30:00',
    }]
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await listMembers()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/familymanagement/members')
    expect(init.method).toBe('GET')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(init.body).toBeUndefined()
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError com todas as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 403,
      ok: false,
      payload: {
        status: 403,
        erro: 'Acesso negado',
        mensagens: ['Somente o principal pode administrar o grupo familiar.'],
        caminho: '/api/familymanagement/members',
      },
    })

    await expect(listMembers()).rejects.toMatchObject({
      status: 403,
      messages: ['Somente o principal pode administrar o grupo familiar.'],
    })
  })
})
