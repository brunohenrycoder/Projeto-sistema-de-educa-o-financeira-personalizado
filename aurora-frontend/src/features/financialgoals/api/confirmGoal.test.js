import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { confirmGoal } from './confirmGoal.js'

function mockFetch({ status, ok = status >= 200 && status < 300, payload = null }) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok,
    text: vi.fn().mockResolvedValue(payload === null ? '' : JSON.stringify(payload)),
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const RESPOSTA = {
  id: 'g1',
  targetAmount: 456.78,
  createdAt: '2026-11-18T10:00:00',
}

afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
  sessionStorage.clear()
})

describe('confirmGoal', () => {
  it('envia POST /financial-goals/confirm com o Bearer central e retorna a meta criada', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: RESPOSTA })

    const result = await confirmGoal({ targetAmount: 456.78 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/financial-goals/confirm')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({ targetAmount: 456.78 })
    expect(result).toEqual(RESPOSTA)
  })

  it('envia exatamente o valor recebido, sem arredondar ou multiplicar', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: RESPOSTA })

    await confirmGoal({ targetAmount: 456.789 })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).targetAmount).toBe(456.789)
  })

  it('propaga ApiError com as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Dados inválidos',
        mensagens: ['O valor-alvo deve ser positivo e ter no máximo duas casas decimais.'],
        caminho: '/api/financial-goals/confirm',
      },
    })

    await expect(confirmGoal({ targetAmount: 1.001 })).rejects.toMatchObject({
      status: 400,
      messages: ['O valor-alvo deve ser positivo e ter no máximo duas casas decimais.'],
    })
  })

  it('não envia identificadores indevidos nem campos extras', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: RESPOSTA })

    await confirmGoal({ targetAmount: 450 })

    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(corpo).toEqual({ targetAmount: 450 })
    expect(corpo).not.toHaveProperty('userId')
    expect(corpo).not.toHaveProperty('familyGroupId')
  })
})
