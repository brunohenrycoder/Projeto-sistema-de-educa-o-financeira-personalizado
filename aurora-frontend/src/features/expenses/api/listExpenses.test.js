import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { listExpenses } from './listExpenses.js'

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

describe('listExpenses', () => {
  it('envia GET /expenses sem query quando nenhum filtro é informado', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: [] })

    const result = await listExpenses()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/expenses')
    expect(init.method).toBe('GET')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(init.body).toBeUndefined()
    expect(result).toEqual([])
  })

  it('envia os quatro filtros documentados como query parameters', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: [] })

    await listExpenses({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      category: 'TRANSPORTE',
      memberId: 'm1',
    })

    const [url] = fetchMock.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/api/expenses')
    expect(parsed.searchParams.get('startDate')).toBe('2026-11-01')
    expect(parsed.searchParams.get('endDate')).toBe('2026-11-30')
    expect(parsed.searchParams.get('category')).toBe('TRANSPORTE')
    expect(parsed.searchParams.get('memberId')).toBe('m1')
  })

  it('envia somente os filtros informados', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: [] })

    await listExpenses({ category: 'ALIMENTACAO' })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/expenses?category=ALIMENTACAO')
  })

  it('propaga ApiError com todas as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 403,
      ok: false,
      payload: {
        status: 403,
        erro: 'Acesso negado',
        mensagens: ['O dependente só pode consultar as próprias despesas.'],
        caminho: '/api/expenses',
      },
    })

    await expect(listExpenses({ memberId: 'outro' })).rejects.toMatchObject({
      status: 403,
      messages: ['O dependente só pode consultar as próprias despesas.'],
    })
  })
})
