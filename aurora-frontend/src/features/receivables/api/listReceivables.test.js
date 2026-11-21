import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { listReceivables } from './listReceivables.js'

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

describe('listReceivables', () => {
  it('envia GET /receivables com o Bearer central e retorna os recebimentos', async () => {
    const resposta = {
      receivables: [{
        id: 'r1',
        recurrenceSeriesId: 's1',
        occurrenceNumber: 1,
        description: 'Salário',
        expectedAmount: 5000,
        expectedDate: '2026-11-05',
        receivedDate: null,
        recurrence: 'MENSAL',
        status: 'ATRASADA',
      }],
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await listReceivables()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/receivables')
    expect(init.method).toBe('GET')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(init.body).toBeUndefined()
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 403,
      ok: false,
      payload: {
        status: 403,
        erro: 'Acesso negado',
        mensagens: ['Somente o Principal pode acessar contas a receber.'],
        caminho: '/api/receivables',
      },
    })

    await expect(listReceivables()).rejects.toMatchObject({
      status: 403,
      messages: ['Somente o Principal pode acessar contas a receber.'],
    })
  })
})
