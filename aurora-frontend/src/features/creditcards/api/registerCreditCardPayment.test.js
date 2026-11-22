import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { registerCreditCardPayment } from './registerCreditCardPayment.js'

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

describe('registerCreditCardPayment', () => {
  it('envia POST /credit-cards/invoices/{invoiceId}/payments com apenas o valor', async () => {
    const resposta = {
      id: 'pg1',
      invoiceId: 'i1',
      amount: 500,
      paidAt: '2026-11-15T10:00:00',
      paidAmount: 500,
      outstandingAmount: 1000,
      invoiceStatus: 'PARTIALLY_PAID',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: resposta })

    const result = await registerCreditCardPayment('i1', { amount: 500 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/credit-cards/invoices/i1/payments')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({ amount: 500 })
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError quando o valor ultrapassa o saldo pendente', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 422,
      ok: false,
      payload: {
        status: 422,
        erro: 'Pagamento inválido',
        mensagens: ['O valor do pagamento não pode ultrapassar o saldo pendente da fatura.'],
        caminho: '/api/credit-cards/invoices/i1/payments',
      },
    })

    await expect(registerCreditCardPayment('i1', { amount: 9000 })).rejects.toMatchObject({
      status: 422,
      messages: ['O valor do pagamento não pode ultrapassar o saldo pendente da fatura.'],
    })
  })

  it('não envia identificadores de usuário, grupo familiar ou cartão', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: { id: 'pg1' } })

    await registerCreditCardPayment('i1', { amount: 500 })

    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(corpo).toEqual({ amount: 500 })
    expect(corpo).not.toHaveProperty('userId')
    expect(corpo).not.toHaveProperty('familyGroupId')
    expect(corpo).not.toHaveProperty('cardId')
  })
})
