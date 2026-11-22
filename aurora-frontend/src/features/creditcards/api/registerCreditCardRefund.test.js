import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { registerCreditCardRefund } from './registerCreditCardRefund.js'

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

describe('registerCreditCardRefund', () => {
  it('envia POST /credit-cards/expenses/{expenseId}/refunds com apenas o valor', async () => {
    const resposta = {
      id: 'est1',
      expenseId: 'e1',
      amount: 100,
      amountAppliedToFutureInstallments: 100,
      amountAppliedToInvoices: 0,
      pendingCreditAmount: 0,
      createdAt: '2026-11-15T10:00:00',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: resposta })

    const result = await registerCreditCardRefund('e1', { amount: 100 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/credit-cards/expenses/e1/refunds')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({ amount: 100 })
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError quando o estorno ultrapassa o valor da compra', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 422,
      ok: false,
      payload: {
        status: 422,
        erro: 'Estorno inválido',
        mensagens: ['O valor do estorno ultrapassa o valor disponível da compra.'],
        caminho: '/api/credit-cards/expenses/e1/refunds',
      },
    })

    await expect(registerCreditCardRefund('e1', { amount: 9000 })).rejects.toMatchObject({
      status: 422,
      messages: ['O valor do estorno ultrapassa o valor disponível da compra.'],
    })
  })

  it('não envia identificadores de usuário, grupo familiar ou cartão', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: { id: 'est1' } })

    await registerCreditCardRefund('e1', { amount: 100 })

    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(corpo).toEqual({ amount: 100 })
    expect(corpo).not.toHaveProperty('userId')
    expect(corpo).not.toHaveProperty('familyGroupId')
    expect(corpo).not.toHaveProperty('cardId')
  })
})
