import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { createReceivable } from './createReceivable.js'

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

describe('createReceivable', () => {
  it('envia POST /receivables com o payload do contrato e sem identificadores', async () => {
    const resposta = {
      id: 'r1',
      recurrenceSeriesId: 's1',
      occurrenceNumber: 1,
      description: 'Salário',
      expectedAmount: 5000,
      expectedDate: '2026-11-05',
      recurrence: 'MENSAL',
      status: 'PENDENTE',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: resposta })

    const result = await createReceivable({
      description: 'Salário',
      expectedAmount: 5000,
      expectedDate: '2026-11-05',
      recurrence: 'MENSAL',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/receivables')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({
      description: 'Salário',
      expectedAmount: 5000,
      expectedDate: '2026-11-05',
      recurrence: 'MENSAL',
    })
    expect(JSON.parse(init.body)).not.toHaveProperty('userId')
    expect(JSON.parse(init.body)).not.toHaveProperty('familyGroupId')
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError com todas as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Dados inválidos',
        mensagens: ['O valor esperado deve ser maior que zero.'],
        caminho: '/api/receivables',
      },
    })

    await expect(createReceivable({
      description: 'Salário', expectedAmount: 0, expectedDate: '2026-11-05', recurrence: 'MENSAL',
    })).rejects.toMatchObject({
      status: 400,
      messages: ['O valor esperado deve ser maior que zero.'],
    })
  })
})
