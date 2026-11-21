import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { createPayableBill } from './createPayableBill.js'

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

describe('createPayableBill', () => {
  it('envia POST /payable-bills com o payload do contrato e sem userId', async () => {
    const resposta = {
      id: 'b1',
      recurrenceSeriesId: 's1',
      occurrenceNumber: 1,
      description: 'Aluguel',
      amount: 1500,
      dueDate: '2026-11-20',
      category: 'MORADIA',
      recurrence: 'MENSAL',
      status: 'PENDENTE',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: resposta })

    const result = await createPayableBill({
      description: 'Aluguel',
      amount: 1500,
      dueDate: '2026-11-20',
      category: 'MORADIA',
      recurrence: 'MENSAL',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/payable-bills')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({
      description: 'Aluguel',
      amount: 1500,
      dueDate: '2026-11-20',
      category: 'MORADIA',
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
        mensagens: ['O valor da conta deve ser maior que zero.'],
        caminho: '/api/payable-bills',
      },
    })

    await expect(createPayableBill({
      description: 'Conta', amount: 0, dueDate: '2026-11-20',
      category: 'MORADIA', recurrence: 'SEM_RECORRENCIA',
    })).rejects.toMatchObject({
      status: 400,
      messages: ['O valor da conta deve ser maior que zero.'],
    })
  })
})
