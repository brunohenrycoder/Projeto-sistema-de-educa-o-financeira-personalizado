import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { updatePayableBillRecurrence } from './updatePayableBillRecurrence.js'

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

describe('updatePayableBillRecurrence', () => {
  it('envia PUT /payable-bills/{id}/recurrence com description, amount, category e nextDueDate', async () => {
    const resposta = {
      recurrenceSeriesId: 's1',
      description: 'Aluguel',
      amount: 1700,
      category: 'MORADIA',
      nextDueDate: '2026-12-20',
      recurrence: 'MENSAL',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await updatePayableBillRecurrence('b1', {
      description: 'Aluguel',
      amount: 1700,
      category: 'MORADIA',
      nextDueDate: '2026-12-20',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/payable-bills/b1/recurrence')
    expect(init.method).toBe('PUT')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({
      description: 'Aluguel',
      amount: 1700,
      category: 'MORADIA',
      nextDueDate: '2026-12-20',
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
        mensagens: ['A próxima data de vencimento é obrigatória.'],
        caminho: '/api/payable-bills/b1/recurrence',
      },
    })

    await expect(updatePayableBillRecurrence('b1', {
      description: 'Aluguel', amount: 10, category: 'MORADIA', nextDueDate: '',
    })).rejects.toMatchObject({ status: 400, messages: ['A próxima data de vencimento é obrigatória.'] })
  })
})
