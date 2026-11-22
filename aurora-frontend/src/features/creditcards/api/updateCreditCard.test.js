import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { updateCreditCard } from './updateCreditCard.js'

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
  totalLimit: 6000,
  closingDay: 12,
  dueDay: 22,
}

describe('updateCreditCard', () => {
  it('envia PUT /credit-cards/{cardId} com o payload do contrato e retorna o cartão atualizado', async () => {
    const resposta = {
      id: 'c1',
      ...PAYLOAD,
      limitUsed: 1500,
      limitAvailable: 4500,
      pendingCreditAmount: 0,
      limitExceeded: false,
      active: true,
      limitDisclaimer: 'Comprometimento calculado considerando parcelas futuras contratadas no Aurora.',
      createdAt: '2026-11-01T10:00:00',
      updatedAt: '2026-11-05T10:00:00',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await updateCreditCard('c1', PAYLOAD)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/credit-cards/c1')
    expect(init.method).toBe('PUT')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual(PAYLOAD)
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError quando a redução de limite é inválida', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 422,
      ok: false,
      payload: {
        status: 422,
        erro: 'Limite inválido',
        mensagens: ['O limite total não pode ficar abaixo do valor comprometido.'],
        caminho: '/api/credit-cards/c1',
      },
    })

    await expect(updateCreditCard('c1', { ...PAYLOAD, totalLimit: 10 })).rejects.toMatchObject({
      status: 422,
      messages: ['O limite total não pode ficar abaixo do valor comprometido.'],
    })
  })

  it('não envia identificadores de usuário ou grupo familiar', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: { id: 'c1' } })

    await updateCreditCard('c1', PAYLOAD)

    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(corpo).not.toHaveProperty('userId')
    expect(corpo).not.toHaveProperty('familyGroupId')
    expect(corpo).not.toHaveProperty('id')
  })
})
