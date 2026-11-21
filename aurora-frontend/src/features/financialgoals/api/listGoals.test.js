import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { listGoals } from './listGoals.js'

function mockFetch({ status, ok = status >= 200 && status < 300, payload = null }) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok,
    text: vi.fn().mockResolvedValue(payload === null ? '' : JSON.stringify(payload)),
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const RESPOSTA = [{
  id: 'g1',
  targetAmount: 450.00,
  createdAt: '2026-11-18T10:00:00',
}]

afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
  sessionStorage.clear()
})

describe('listGoals', () => {
  it('envia GET /financial-goals com o Bearer central e retorna as metas', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    const result = await listGoals()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/financial-goals')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers.has('Content-Type')).toBe(false)
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(result).toEqual(RESPOSTA)
  })

  it('retorna lista vazia conforme o contrato do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({ status: 200, payload: [] })

    expect(await listGoals()).toEqual([])
  })

  it('propaga ApiError com as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 403,
      ok: false,
      payload: {
        status: 403,
        erro: 'Acesso negado',
        mensagens: ['Somente o Principal pode acessar metas financeiras familiares.'],
        caminho: '/api/financial-goals',
      },
    })

    await expect(listGoals()).rejects.toMatchObject({
      status: 403,
      messages: ['Somente o Principal pode acessar metas financeiras familiares.'],
    })
  })

  it('não envia identificadores de usuário ou família', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: [] })

    await listGoals()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).not.toContain('userId')
    expect(url).not.toContain('familyGroupId')
    expect(init.body).toBeUndefined()
  })
})
