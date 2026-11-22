import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { getCreditCardInvoice } from './getCreditCardInvoice.js'

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

describe('getCreditCardInvoice', () => {
  it('envia GET /credit-cards/invoices/{invoiceId} e retorna o detalhamento completo', async () => {
    const resposta = {
      id: 'i1',
      cardId: 'c1',
      cycleStart: '2026-11-01',
      closingDate: '2026-11-10',
      dueDate: '2026-11-20',
      status: 'OPEN',
      totalAmount: 1500,
      paidAmount: 500,
      creditAmount: 0,
      outstandingAmount: 1000,
      installments: [{
        id: 'parc1',
        expenseId: 'e1',
        memberName: 'Ana Silva',
        category: 'ELETRODOMESTICOS',
        amount: 500,
        paidAmount: 500,
        refundedAmount: 0,
        outstandingAmount: 0,
        installmentNumber: 1,
        installmentCount: 3,
        cancelled: false,
      }],
      payments: [{
        id: 'pg1',
        amount: 500,
        paidAt: '2026-11-15T10:00:00',
        registeredBy: 'Ana Silva',
      }],
      creditApplications: [],
      refunds: [],
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await getCreditCardInvoice('i1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/credit-cards/invoices/i1')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError quando a fatura não é encontrada', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 404,
      ok: false,
      payload: {
        status: 404,
        erro: 'Não encontrado',
        mensagens: ['Fatura não encontrada.'],
        caminho: '/api/credit-cards/invoices/i1',
      },
    })

    await expect(getCreditCardInvoice('i1')).rejects.toMatchObject({
      status: 404,
      messages: ['Fatura não encontrada.'],
    })
  })
})
