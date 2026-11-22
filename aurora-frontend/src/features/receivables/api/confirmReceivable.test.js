import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { confirmReceivable } from './confirmReceivable.js'

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

describe('confirmReceivable', () => {
  it('envia POST /receivables/{id}/confirm com receivedDate e amount opcional', async () => {
    const resposta = {
      confirmationId: 'c1',
      receivableId: 'r1',
      amount: 5000,
      expectedDate: '2026-11-05',
      receivedDate: '2026-11-05',
      status: 'RECEBIDA',
      nextOccurrenceId: 'r2',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: resposta })

    const result = await confirmReceivable('r1', {
      receivedDate: '2026-11-05',
      amount: 5000,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/receivables/r1/confirm')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({
      receivedDate: '2026-11-05',
      amount: 5000,
    })
    expect(JSON.parse(init.body)).not.toHaveProperty('receivedAmount')
    expect(JSON.parse(init.body)).not.toHaveProperty('userId')
    expect(result).toEqual(resposta)
  })

  it('omite amount quando não informado', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: { status: 'RECEBIDA' } })

    await confirmReceivable('r1', { receivedDate: '2026-11-05' })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      receivedDate: '2026-11-05',
    })
  })

  it('propaga ApiError de recebimento parcial', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Recebimento inválido',
        mensagens: ['O valor recebido deve ser igual ao valor esperado.'],
        caminho: '/api/receivables/r1/confirm',
      },
    })

    await expect(confirmReceivable('r1', {
      receivedDate: '2026-11-05', amount: 4000,
    })).rejects.toMatchObject({
      status: 400,
      messages: ['O valor recebido deve ser igual ao valor esperado.'],
    })
  })
})
