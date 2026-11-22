import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { registerPayableBillPayment } from './registerPayableBillPayment.js'

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

describe('registerPayableBillPayment', () => {
  it('envia POST /payable-bills/{id}/payments com data, método e valor opcional', async () => {
    const resposta = {
      paymentId: 'p1',
      payableBillId: 'b1',
      expenseId: 'e1',
      amount: 1500,
      paymentDate: '2026-11-18',
      paymentMethod: 'PIX',
      status: 'PAGA',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: resposta })

    const result = await registerPayableBillPayment('b1', {
      paymentDate: '2026-11-18',
      paymentMethod: 'PIX',
      amount: 1500,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/payable-bills/b1/payments')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({
      paymentDate: '2026-11-18',
      paymentMethod: 'PIX',
      amount: 1500,
    })
    expect(JSON.parse(init.body)).not.toHaveProperty('userId')
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError de pagamento parcial', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Pagamento inválido',
        mensagens: ['A conta deve ser quitada integralmente em um único pagamento.'],
        caminho: '/api/payable-bills/b1/payments',
      },
    })

    await expect(registerPayableBillPayment('b1', {
      paymentDate: '2026-11-18', paymentMethod: 'PIX', amount: 10,
    })).rejects.toMatchObject({
      status: 400,
      messages: ['A conta deve ser quitada integralmente em um único pagamento.'],
    })
  })
})
