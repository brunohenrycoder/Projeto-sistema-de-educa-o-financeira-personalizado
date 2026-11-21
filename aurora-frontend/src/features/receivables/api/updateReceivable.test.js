import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { updateReceivable } from './updateReceivable.js'

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

describe('updateReceivable', () => {
  it('envia PUT /receivables/{id} com descrição, valor e data prevista', async () => {
    const resposta = {
      id: 'r1',
      description: 'Salário com bônus',
      expectedAmount: 5500,
      expectedDate: '2026-11-06',
      recurrence: 'MENSAL',
      status: 'PENDENTE',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await updateReceivable('r1', {
      description: 'Salário com bônus',
      expectedAmount: 5500,
      expectedDate: '2026-11-06',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/receivables/r1')
    expect(init.method).toBe('PUT')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({
      description: 'Salário com bônus',
      expectedAmount: 5500,
      expectedDate: '2026-11-06',
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
        erro: 'Alteração inválida',
        mensagens: ['Recebimentos recebidos não podem ser alterados.'],
        caminho: '/api/receivables/r1',
      },
    })

    await expect(updateReceivable('r1', {
      description: 'Teste', expectedAmount: 10, expectedDate: '2026-11-06',
    })).rejects.toMatchObject({
      status: 400,
      messages: ['Recebimentos recebidos não podem ser alterados.'],
    })
  })
})
