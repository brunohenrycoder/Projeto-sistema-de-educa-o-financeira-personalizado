import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { createCreditCard } from './createCreditCard.js'

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

const PAYLOAD = {
  name: 'Cartão Principal',
  issuer: 'Banco do Brasil',
  network: 'VISA',
  otherNetworkName: null,
  lastFourDigits: '1234',
  totalLimit: 5000,
  closingDay: 10,
  dueDay: 20,
}

describe('createCreditCard', () => {
  it('envia POST /credit-cards com o payload do contrato e retorna o cartão criado', async () => {
    const resposta = {
      id: 'c1',
      ...PAYLOAD,
      limitUsed: 0,
      limitAvailable: 5000,
      pendingCreditAmount: 0,
      limitExceeded: false,
      active: true,
      limitDisclaimer: 'Comprometimento calculado considerando parcelas futuras contratadas no Aurora.',
      createdAt: '2026-11-01T10:00:00',
      updatedAt: '2026-11-01T10:00:00',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: resposta })

    const result = await createCreditCard(PAYLOAD)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/credit-cards')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual(PAYLOAD)
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError com as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Dados inválidos',
        mensagens: ['O limite total deve ser maior que zero.', 'O dia de fechamento deve estar entre 1 e 28.'],
        caminho: '/api/credit-cards',
      },
    })

    await expect(createCreditCard({ ...PAYLOAD, totalLimit: 0 })).rejects.toMatchObject({
      status: 400,
      messages: ['O limite total deve ser maior que zero.', 'O dia de fechamento deve estar entre 1 e 28.'],
    })
  })

  it('não envia identificadores de usuário, grupo familiar ou cartão', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: { id: 'c1' } })

    await createCreditCard(PAYLOAD)

    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(corpo).not.toHaveProperty('userId')
    expect(corpo).not.toHaveProperty('familyGroupId')
    expect(corpo).not.toHaveProperty('cardId')
    expect(corpo).not.toHaveProperty('id')
  })
})
