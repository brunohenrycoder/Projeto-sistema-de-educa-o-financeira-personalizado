import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { getExpensesByMember } from './getExpensesByMember.js'

function mockFetch({ status, ok = status >= 200 && status < 300, payload = null }) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok,
    text: vi.fn().mockResolvedValue(payload === null ? '' : JSON.stringify(payload)),
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const RESPOSTA = [{ memberId: 'm1', memberName: 'Ana', totalAmount: 320.00 }]

afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
  sessionStorage.clear()
})

describe('getExpensesByMember', () => {
  it('envia GET /reports-analytics/expenses/by-member com o Bearer central', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    const result = await getExpensesByMember()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/reports-analytics/expenses/by-member')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(result).toEqual(RESPOSTA)
  })

  it('envia todos os filtros previstos no contrato', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    await getExpensesByMember({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      category: 'ALIMENTACAO',
      memberId: 'm1',
    })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8080/api/reports-analytics/expenses/by-member'
      + '?startDate=2026-11-01&endDate=2026-11-30&category=ALIMENTACAO&memberId=m1',
    )
  })

  it('aceita resposta vazia', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({ status: 200, payload: [] })

    expect(await getExpensesByMember()).toEqual([])
  })

  it('propaga ApiError com as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 403,
      ok: false,
      payload: {
        status: 403,
        erro: 'Acesso negado',
        mensagens: ['Somente o Principal pode consultar relatórios familiares.'],
        caminho: '/api/reports-analytics/expenses/by-member',
      },
    })

    await expect(getExpensesByMember()).rejects.toMatchObject({
      status: 403,
      messages: ['Somente o Principal pode consultar relatórios familiares.'],
    })
  })

  it('não envia identificadores indevidos', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    await getExpensesByMember({ memberId: 'm1' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('memberId=m1')
    expect(url).not.toContain('userId')
    expect(url).not.toContain('familyGroupId')
    expect(init.body).toBeUndefined()
  })
})
