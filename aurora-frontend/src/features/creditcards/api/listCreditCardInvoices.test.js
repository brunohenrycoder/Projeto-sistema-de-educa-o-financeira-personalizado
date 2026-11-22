import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { listCreditCardInvoices } from './listCreditCardInvoices.js'

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

const RESPOSTA = {
  invoices: [{
    id: 'i1',
    cardId: 'c1',
    cycleStart: '2026-11-01',
    closingDate: '2026-11-10',
    dueDate: '2026-11-20',
    status: 'OPEN',
    totalAmount: 1500,
    paidAmount: 0,
    creditAmount: 0,
    outstandingAmount: 1500,
  }],
}

describe('listCreditCardInvoices', () => {
  it('envia GET /credit-cards/invoices sem query quando não há status', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    const result = await listCreditCardInvoices()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/credit-cards/invoices')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(result).toEqual(RESPOSTA)
  })

  it('envia o status como parâmetro de consulta', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    await listCreditCardInvoices({ status: 'OVERDUE' })

    expect(fetchMock.mock.calls[0][0])
      .toBe('http://localhost:8080/api/credit-cards/invoices?status=OVERDUE')
  })

  it('omite o parâmetro quando o status é vazio', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    await listCreditCardInvoices({ status: '' })

    expect(fetchMock.mock.calls[0][0])
      .toBe('http://localhost:8080/api/credit-cards/invoices')
  })

  it('propaga ApiError com as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 403,
      ok: false,
      payload: {
        status: 403,
        erro: 'Acesso negado',
        mensagens: ['Somente o Principal pode consultar faturas.'],
        caminho: '/api/credit-cards/invoices',
      },
    })

    await expect(listCreditCardInvoices()).rejects.toMatchObject({
      status: 403,
      messages: ['Somente o Principal pode consultar faturas.'],
    })
  })
})
