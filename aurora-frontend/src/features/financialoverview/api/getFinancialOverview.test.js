import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { getFinancialOverview } from './getFinancialOverview.js'

function mockFetch({ status, ok = status >= 200 && status < 300, payload = null }) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok,
    text: vi.fn().mockResolvedValue(payload === null ? '' : JSON.stringify(payload)),
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

function overviewPayload(overrides = {}) {
  return {
    period: '2026-11',
    realizedIncome: 5000.00,
    plannedIncome: 0.00,
    realizedExpenses: 1800.00,
    plannedExpenses: 1200.00,
    projectedBalance: 2000.00,
    incomeConsidered: 5000.00,
    expensesConsidered: 3000.00,
    commitmentPercent: 60.00,
    alertThresholdPercent: 80.00,
    thresholdReached: false,
    alert: null,
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
  sessionStorage.clear()
})

describe('getFinancialOverview', () => {
  it('envia GET /financial-overview com o Bearer central e retorna o payload', async () => {
    const resposta = overviewPayload()
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await getFinancialOverview()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/financial-overview')
    expect(init.method).toBe('GET')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(init.body).toBeUndefined()
    expect(result).toEqual(resposta)
  })

  it('envia month=2026-11 como query parameter', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: overviewPayload() })

    await getFinancialOverview({ month: '2026-11' })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/financial-overview?month=2026-11')
  })

  it('normaliza month=2026-11-05 para 2026-11', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: overviewPayload() })

    await getFinancialOverview({ month: '2026-11-05' })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/financial-overview?month=2026-11')
  })

  it('não envia query quando o período é omitido', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: overviewPayload() })

    await getFinancialOverview()
    await getFinancialOverview({})

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8080/api/financial-overview')
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:8080/api/financial-overview')
  })

  it('não envia query quando o período está vazio ou é inválido', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: overviewPayload() })

    await getFinancialOverview({ month: '' })
    await getFinancialOverview({ month: '11/2026' })

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8080/api/financial-overview')
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:8080/api/financial-overview')
  })

  it('propaga ApiError 403 com as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 403,
      ok: false,
      payload: {
        status: 403,
        erro: 'Acesso negado',
        mensagens: ['Somente o Principal pode consultar a visão financeira consolidada.'],
        caminho: '/api/financial-overview',
      },
    })

    await expect(getFinancialOverview({ month: '2026-11' })).rejects.toMatchObject({
      status: 403,
      erro: 'Acesso negado',
      messages: ['Somente o Principal pode consultar a visão financeira consolidada.'],
      caminho: '/api/financial-overview',
    })
  })

  it('não envia userId/familyGroupId na URL nem corpo na requisição', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: overviewPayload() })

    await getFinancialOverview({ month: '2026-11' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).not.toMatch(/userId|familyGroupId/i)
    expect(Object.fromEntries(new URL(url).searchParams)).toEqual({ month: '2026-11' })
    expect(init.body).toBeUndefined()
  })

  it('usa o tokenProvider central em todas as chamadas', async () => {
    const fetchMock = mockFetch({ status: 200, payload: overviewPayload() })

    setTokenProvider(() => 'token-principal')
    await getFinancialOverview()
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer token-principal')

    setTokenProvider(() => 'outro-token')
    await getFinancialOverview({ month: '2026-10' })
    expect(fetchMock.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer outro-token')

    setTokenProvider(null)
    await getFinancialOverview()
    expect(fetchMock.mock.calls[2][1].headers.has('Authorization')).toBe(false)
  })

  it('retorna sem erro o payload com commitmentPercent null quando não há renda considerada', async () => {
    const resposta = overviewPayload({
      realizedIncome: 0.00,
      plannedIncome: 0.00,
      realizedExpenses: 1200.00,
      plannedExpenses: 0.00,
      projectedBalance: -1200.00,
      incomeConsidered: 0.00,
      expensesConsidered: 1200.00,
      commitmentPercent: null,
      thresholdReached: false,
      alert: null,
    })
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await getFinancialOverview({ month: '2026-11' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(resposta)
    expect(result.commitmentPercent).toBeNull()
    expect(result.thresholdReached).toBe(false)
    expect(result.alert).toBeNull()
  })
})
