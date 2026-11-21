import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { updateReceivableRecurrence } from './updateReceivableRecurrence.js'

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

describe('updateReceivableRecurrence', () => {
  it('envia PUT /receivables/{id}/recurrence com nextExpectedDate e recurrenceDay', async () => {
    const resposta = {
      recurrenceSeriesId: 's1',
      recurrence: 'MENSAL',
      nextExpectedDate: '2026-12-05',
      updatedOccurrences: 3,
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await updateReceivableRecurrence('r1', {
      description: 'Salário Atualizado',
      expectedAmount: 5500,
      nextExpectedDate: '2026-12-05',
      recurrenceDay: 5,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/receivables/r1/recurrence')
    expect(init.method).toBe('PUT')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({
      description: 'Salário Atualizado',
      expectedAmount: 5500,
      nextExpectedDate: '2026-12-05',
      recurrenceDay: 5,
    })
    expect(JSON.parse(init.body)).not.toHaveProperty('userId')
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Recorrência inválida',
        mensagens: ['O dia de recorrência deve estar entre 1 e 31.'],
        caminho: '/api/receivables/r1/recurrence',
      },
    })

    await expect(updateReceivableRecurrence('r1', {
      description: 'Salário', expectedAmount: 5000,
      nextExpectedDate: '2026-12-05', recurrenceDay: 32,
    })).rejects.toMatchObject({
      status: 400,
      messages: ['O dia de recorrência deve estar entre 1 e 31.'],
    })
  })
})
