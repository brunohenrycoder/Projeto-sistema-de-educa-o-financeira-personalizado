import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { registerExpense } from './registerExpense.js'

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

describe('registerExpense', () => {
  it('envia POST /expenses com o payload do contrato, sem userId, e retorna a despesa criada', async () => {
    const resposta = {
      id: 'e1',
      familyGroupId: 'f1',
      userId: 'u1',
      userName: 'Filho',
      userRole: 'DEPENDENTE',
      amount: 42.5,
      expenseDate: '2026-11-18',
      category: 'TRANSPORTE',
      paymentMethod: 'CARTAO_CREDITO',
      description: 'Corrida de Uber',
      createdAt: '2026-11-18T10:00:00',
      updatedAt: '2026-11-18T10:00:00',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: resposta })

    const result = await registerExpense({
      amount: 42.5,
      expenseDate: '2026-11-18',
      category: 'TRANSPORTE',
      paymentMethod: 'CARTAO_CREDITO',
      description: 'Corrida de Uber',
      installmentCount: 1,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/expenses')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({
      amount: 42.5,
      expenseDate: '2026-11-18',
      category: 'TRANSPORTE',
      paymentMethod: 'CARTAO_CREDITO',
      description: 'Corrida de Uber',
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
        erro: 'Dados inválidos',
        mensagens: ['O valor da despesa deve ser maior que zero.'],
        caminho: '/api/expenses',
      },
    })

    await expect(registerExpense({
      amount: 0,
      expenseDate: '2026-11-18',
      category: 'TRANSPORTE',
      paymentMethod: 'PIX',
    })).rejects.toMatchObject({
      status: 400,
      messages: ['O valor da despesa deve ser maior que zero.'],
    })
  })
})
