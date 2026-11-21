import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { deleteExpense } from './deleteExpense.js'

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

describe('deleteExpense', () => {
  it('envia DELETE com o expenseId na URL, o Bearer central e aceita 204 sem corpo', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 204 })

    const result = await deleteExpense('e1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/expenses/e1')
    expect(init.method).toBe('DELETE')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(init.body).toBeUndefined()
    expect(result).toBeNull()
  })

  it('propaga ApiError com todas as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 403,
      ok: false,
      payload: {
        status: 403,
        erro: 'Acesso negado',
        mensagens: ['Somente o registrante pode excluir esta despesa.'],
        caminho: '/api/expenses/e1',
      },
    })

    await expect(deleteExpense('e1')).rejects.toMatchObject({
      status: 403,
      messages: ['Somente o registrante pode excluir esta despesa.'],
    })
  })
})
