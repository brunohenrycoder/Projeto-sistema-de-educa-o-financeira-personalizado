import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { getSpendingPatterns } from './getSpendingPatterns.js'

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
  topCategories: [{
    category: 'ALIMENTACAO',
    currentAmount: 1200.00,
    historicalAverage: 1000.00,
    variationPercent: 20.00,
  }],
}

afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
  sessionStorage.clear()
})

describe('getSpendingPatterns', () => {
  it('envia GET /reports-analytics/patterns com o mês e o Bearer central', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    const result = await getSpendingPatterns({ month: '2026-11' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/reports-analytics/patterns?month=2026-11')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(result).toEqual(RESPOSTA)
  })

  it('envia category e memberId sem transformar o mês', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    await getSpendingPatterns({ month: '2026-11', category: 'LAZER', memberId: 'm1' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8080/api/reports-analytics/patterns'
      + '?month=2026-11&category=LAZER&memberId=m1',
    )
  })

  it('aceita resposta sem análise disponível', async () => {
    setTokenProvider(() => 'token-de-teste')
    const vazia = { period: '2026-11', analysisAvailable: false, historyMonthsUsed: 1, topCategories: [] }
    mockFetch({ status: 200, payload: vazia })

    expect(await getSpendingPatterns({ month: '2026-11' })).toEqual(vazia)
  })

  it('propaga ApiError para mês inválido', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Dados inválidos',
        mensagens: ['O período é obrigatório e deve estar no formato AAAA-MM.'],
        caminho: '/api/reports-analytics/patterns',
      },
    })

    await expect(getSpendingPatterns({ month: 'invalido' })).rejects.toMatchObject({
      status: 400,
      messages: ['O período é obrigatório e deve estar no formato AAAA-MM.'],
    })
  })

  it('não envia identificadores indevidos', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    await getSpendingPatterns({ month: '2026-11', memberId: 'm1' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('memberId=m1')
    expect(url).not.toContain('userId')
    expect(url).not.toContain('familyGroupId')
    expect(init.body).toBeUndefined()
  })
})
