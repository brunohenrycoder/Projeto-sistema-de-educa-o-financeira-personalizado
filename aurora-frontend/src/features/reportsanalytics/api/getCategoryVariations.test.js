import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { getCategoryVariations } from './getCategoryVariations.js'

function mockFetch({ status, ok = status >= 200 && status < 300, payload = null }) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok,
    text: vi.fn().mockResolvedValue(payload === null ? '' : JSON.stringify(payload)),
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const RESPOSTA = {
  period: '2026-11',
  analysisAvailable: true,
  historyMonthsUsed: 3,
  variations: [{
    category: 'LAZER',
    currentAmount: 650.00,
    historicalAverage: 500.00,
    variationPercent: 30.00,
  }],
}

afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
  sessionStorage.clear()
})

describe('getCategoryVariations', () => {
  it('envia GET /reports-analytics/category-variations com o mês e o Bearer central', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    const result = await getCategoryVariations({ month: '2026-11' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/reports-analytics/category-variations?month=2026-11')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(result).toEqual(RESPOSTA)
  })

  it('envia category e memberId sem transformar o mês', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    await getCategoryVariations({ month: '2026-11', category: 'LAZER', memberId: 'm1' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8080/api/reports-analytics/category-variations'
      + '?month=2026-11&category=LAZER&memberId=m1',
    )
  })

  it('aceita resposta sem variações', async () => {
    setTokenProvider(() => 'token-de-teste')
    const vazia = { period: '2026-11', analysisAvailable: true, historyMonthsUsed: 3, variations: [] }
    mockFetch({ status: 200, payload: vazia })

    expect(await getCategoryVariations({ month: '2026-11' })).toEqual(vazia)
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
        caminho: '/api/reports-analytics/category-variations',
      },
    })

    await expect(getCategoryVariations({ month: '2026-11' })).rejects.toMatchObject({
      status: 403,
      messages: ['Somente o Principal pode consultar relatórios familiares.'],
    })
  })

  it('não envia identificadores indevidos', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    await getCategoryVariations({ month: '2026-11', memberId: 'm1' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('memberId=m1')
    expect(url).not.toContain('userId')
    expect(url).not.toContain('familyGroupId')
    expect(init.body).toBeUndefined()
  })
})
