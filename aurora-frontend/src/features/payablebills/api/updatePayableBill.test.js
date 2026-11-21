import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { updatePayableBill } from './updatePayableBill.js'

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

describe('updatePayableBill', () => {
  it('envia PUT /payable-bills/{id} com os campos da ocorrência', async () => {
    const resposta = {
      id: 'b1',
      recurrenceSeriesId: 's1',
      occurrenceNumber: 1,
      description: 'Aluguel atualizado',
      amount: 1600,
      dueDate: '2026-11-21',
      category: 'MORADIA',
      recurrence: 'MENSAL',
      status: 'PENDENTE',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await updatePayableBill('b1', {
      description: 'Aluguel atualizado',
      amount: 1600,
      dueDate: '2026-11-21',
      category: 'MORADIA',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/payable-bills/b1')
    expect(init.method).toBe('PUT')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({
      description: 'Aluguel atualizado',
      amount: 1600,
      dueDate: '2026-11-21',
      category: 'MORADIA',
    })
    expect(JSON.parse(init.body)).not.toHaveProperty('userId')
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 404,
      ok: false,
      payload: {
        status: 404,
        erro: 'Conta não encontrada',
        mensagens: ['Conta a pagar não encontrada.'],
        caminho: '/api/payable-bills/b1',
      },
    })

    await expect(updatePayableBill('b1', {
      description: 'Conta', amount: 10, dueDate: '2026-11-20', category: 'MORADIA',
    })).rejects.toMatchObject({ status: 404, messages: ['Conta a pagar não encontrada.'] })
  })
})
