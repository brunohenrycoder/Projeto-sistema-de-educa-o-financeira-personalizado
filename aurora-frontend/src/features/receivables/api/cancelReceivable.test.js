import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { cancelReceivable } from './cancelReceivable.js'

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

describe('cancelReceivable', () => {
  it.each(['SOMENTE_OCORRENCIA', 'OCORRENCIA_E_FUTURAS'])(
    'envia POST /receivables/{id}/cancel com o scope %s',
    async (scope) => {
      const resposta = { cancelledReceivableIds: ['r1'], recurrenceActive: scope === 'SOMENTE_OCORRENCIA' }
      setTokenProvider(() => 'token-de-teste')
      const fetchMock = mockFetch({ status: 200, payload: resposta })

      const result = await cancelReceivable('r1', { scope })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('http://localhost:8080/api/receivables/r1/cancel')
      expect(init.method).toBe('POST')
      expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
      expect(JSON.parse(init.body)).toEqual({ scope })
      expect(JSON.parse(init.body)).not.toHaveProperty('userId')
      expect(result).toEqual(resposta)
    },
  )

  it('propaga ApiError do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Cancelamento inválido',
        mensagens: ['Recebimentos confirmados não podem ser cancelados.'],
        caminho: '/api/receivables/r1/cancel',
      },
    })

    await expect(cancelReceivable('r1', { scope: 'SOMENTE_OCORRENCIA' }))
      .rejects.toMatchObject({
        status: 400,
        messages: ['Recebimentos confirmados não podem ser cancelados.'],
      })
  })
})
