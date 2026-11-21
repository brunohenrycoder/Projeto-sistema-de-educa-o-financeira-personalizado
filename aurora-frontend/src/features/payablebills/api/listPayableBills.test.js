import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { listPayableBills } from './listPayableBills.js'

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

describe('listPayableBills', () => {
  it('envia GET /payable-bills com o Bearer central e retorna as contas', async () => {
    const resposta = {
      bills: [{
        id: 'b1',
        recurrenceSeriesId: 's1',
        occurrenceNumber: 1,
        description: 'Aluguel',
        amount: 1500,
        dueDate: '2026-11-20',
        category: 'MORADIA',
        recurrence: 'MENSAL',
        status: 'ATRASADA',
      }],
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await listPayableBills()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/payable-bills')
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
        mensagens: ['Somente o Principal pode acessar contas a pagar.'],
        caminho: '/api/payable-bills',
      },
    })

    await expect(listPayableBills()).rejects.toMatchObject({
      status: 403,
      messages: ['Somente o Principal pode acessar contas a pagar.'],
    })
  })
})
