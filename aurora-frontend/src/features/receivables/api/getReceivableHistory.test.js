import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { getReceivableHistory } from './getReceivableHistory.js'

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

describe('getReceivableHistory', () => {
  it('envia GET /receivables/{id}/history e retorna histórico e confirmação', async () => {
    const resposta = {
      receivableId: 'r1',
      history: [{
        id: 'h1',
        changedBy: 'Ana Silva',
        changedAt: '2026-11-05T10:00:00',
        previousStatus: 'PENDENTE',
        status: 'RECEBIDA',
        previousDescription: 'Salário',
        description: 'Salário',
        previousExpectedAmount: 5000,
        expectedAmount: 5000,
        previousExpectedDate: '2026-11-05',
        expectedDate: '2026-11-05',
      }],
      confirmation: {
        amount: 5000,
        expectedDate: '2026-11-05',
        receivedDate: '2026-11-05',
        receivedBy: 'Ana Silva',
      },
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await getReceivableHistory('r1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/receivables/r1/history')
    expect(init.method).toBe('GET')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(init.body).toBeUndefined()
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 404,
      ok: false,
      payload: {
        status: 404,
        erro: 'Recebimento não encontrado',
        mensagens: ['Recebimento não encontrado.'],
        caminho: '/api/receivables/r1/history',
      },
    })

    await expect(getReceivableHistory('r1'))
      .rejects.toMatchObject({ status: 404, messages: ['Recebimento não encontrado.'] })
  })
})
