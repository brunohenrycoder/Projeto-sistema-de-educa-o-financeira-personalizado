import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { listCreditCards } from './listCreditCards.js'

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

describe('listCreditCards', () => {
  it('envia GET /credit-cards com o Bearer central e retorna os cartões', async () => {
    const resposta = {
      cards: [{
        id: 'c1',
        name: 'Cartão Principal',
        issuer: 'Banco do Brasil',
        network: 'VISA',
        otherNetworkName: null,
        lastFourDigits: '1234',
        totalLimit: 5000,
        limitUsed: 1500,
        limitAvailable: 3500,
        pendingCreditAmount: 0,
        limitExceeded: false,
        closingDay: 10,
        dueDay: 20,
        active: true,
        limitDisclaimer: 'Comprometimento calculado considerando parcelas futuras contratadas no Aurora.',
        createdAt: '2026-11-01T10:00:00',
        updatedAt: '2026-11-01T10:00:00',
      }],
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await listCreditCards()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/credit-cards')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError com as mensagens do backend e não envia identificadores', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({
      status: 403,
      ok: false,
      payload: {
        status: 403,
        erro: 'Acesso negado',
        mensagens: ['Somente o Principal pode consultar cartões.'],
        caminho: '/api/credit-cards',
      },
    })

    await expect(listCreditCards()).rejects.toMatchObject({
      status: 403,
      messages: ['Somente o Principal pode consultar cartões.'],
    })
    expect(fetchMock.mock.calls[0][0]).not.toContain('userId')
    expect(fetchMock.mock.calls[0][0]).not.toContain('familyGroupId')
  })
})
