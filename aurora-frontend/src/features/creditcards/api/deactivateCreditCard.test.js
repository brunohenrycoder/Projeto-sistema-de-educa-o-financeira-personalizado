import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { deactivateCreditCard } from './deactivateCreditCard.js'

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

describe('deactivateCreditCard', () => {
  it('envia DELETE /credit-cards/{cardId} sem corpo e retorna null para 204', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 204 })

    const result = await deactivateCreditCard('c1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/credit-cards/c1')
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(result).toBeNull()
  })

  it('propaga ApiError quando o cartão não pode ser desativado', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 404,
      ok: false,
      payload: {
        status: 404,
        erro: 'Não encontrado',
        mensagens: ['Cartão de crédito não encontrado.'],
        caminho: '/api/credit-cards/c1',
      },
    })

    await expect(deactivateCreditCard('c1')).rejects.toMatchObject({
      status: 404,
      messages: ['Cartão de crédito não encontrado.'],
    })
  })
})
