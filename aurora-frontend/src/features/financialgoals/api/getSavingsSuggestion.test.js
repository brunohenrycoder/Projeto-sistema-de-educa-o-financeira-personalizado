import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { getSavingsSuggestion } from './getSavingsSuggestion.js'

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

describe('getSavingsSuggestion', () => {
  it('envia GET /financial-goals/savings-suggestion com o Bearer central', async () => {
    const resposta = { averageMonthlySurplus: 450.00 }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await getSavingsSuggestion()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/financial-goals/savings-suggestion')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers.has('Content-Type')).toBe(false)
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(result).toEqual(resposta)
  })

  it('trata 204 No Content como ausência de sugestão, sem erro', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({ status: 204 })

    await expect(getSavingsSuggestion()).resolves.toBeNull()
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
        caminho: '/api/financial-goals/savings-suggestion',
      },
    })

    await expect(getSavingsSuggestion()).rejects.toMatchObject({
      status: 403,
      messages: ['Somente o Principal pode acessar metas financeiras familiares.'],
    })
  })

  it('não envia identificadores de usuário ou família', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: { averageMonthlySurplus: 450 } })

    await getSavingsSuggestion()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).not.toContain('userId')
    expect(url).not.toContain('familyGroupId')
    expect(init.body).toBeUndefined()
  })
})
