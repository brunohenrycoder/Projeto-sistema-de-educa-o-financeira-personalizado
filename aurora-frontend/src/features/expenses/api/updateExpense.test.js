import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { updateExpense } from './updateExpense.js'

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

describe('updateExpense', () => {
  it('envia PUT com o expenseId na URL e o payload do contrato, sem userId', async () => {
    const resposta = {
      id: 'e1',
      familyGroupId: 'f1',
      userId: 'u1',
      userName: 'Filho',
      userRole: 'DEPENDENTE',
      amount: 50,
      expenseDate: '2026-11-18',
      category: 'TRANSPORTE',
      paymentMethod: 'PIX',
      description: 'Corrida atualizada',
      createdAt: '2026-11-18T10:00:00',
      updatedAt: '2026-11-18T11:00:00',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await updateExpense('e1', {
      amount: 50,
      expenseDate: '2026-11-18',
      category: 'TRANSPORTE',
      paymentMethod: 'PIX',
      description: 'Corrida atualizada',
      installmentCount: 1,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/expenses/e1')
    expect(init.method).toBe('PUT')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({
      amount: 50,
      expenseDate: '2026-11-18',
      category: 'TRANSPORTE',
      paymentMethod: 'PIX',
      description: 'Corrida atualizada',
      installmentCount: 1,
    })
    expect(JSON.parse(init.body)).not.toHaveProperty('userId')
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError com todas as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Operação não permitida',
        mensagens: ['Não é possível alterar despesas de uma fatura fechada.'],
        caminho: '/api/expenses/e1',
      },
    })

    await expect(updateExpense('e1', { amount: 10 })).rejects.toMatchObject({
      status: 400,
      messages: ['Não é possível alterar despesas de uma fatura fechada.'],
    })
  })
})
