import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { listPayableBillPayments } from './listPayableBillPayments.js'

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

describe('listPayableBillPayments', () => {
  it('envia GET /payable-bills/{id}/payments e retorna o histórico', async () => {
    const resposta = {
      payments: [{
        id: 'p1',
        payableBillId: 'b1',
        expenseId: 'e1',
        amount: 1500,
        paymentDate: '2026-11-18',
        paymentMethod: 'PIX',
        paidByUserId: 'u1',
        paidByName: 'Ana Silva',
        createdAt: '2026-11-18T10:00:00',
      }],
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await listPayableBillPayments('b1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/payable-bills/b1/payments')
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
        erro: 'Conta não encontrada',
        mensagens: ['Conta a pagar não encontrada.'],
        caminho: '/api/payable-bills/b1/payments',
      },
    })

    await expect(listPayableBillPayments('b1'))
      .rejects.toMatchObject({ status: 404, messages: ['Conta a pagar não encontrada.'] })
  })
})
