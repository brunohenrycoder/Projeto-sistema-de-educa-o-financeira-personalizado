import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { registerUser } from './registerUser.js'

const PAYLOAD = {
  name: 'Maria Silva',
  email: 'maria@example.com',
  password: 'SenhaSegura123',
  passwordConfirmation: 'SenhaSegura123',
}

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

describe('registerUser', () => {
  it('envia POST com o payload do contrato e não armazena sessão', async () => {
    const fetchMock = mockFetch({ status: 201, payload: { userId: 'u1', role: 'PRINCIPAL' } })

    const response = await registerUser(PAYLOAD)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/auth/register')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual(PAYLOAD)
    expect(init.headers.has('Authorization')).toBe(false)
    expect(response).toEqual({ userId: 'u1', role: 'PRINCIPAL' })
    expect(sessionStorage.getItem('aurora.session')).toBeNull()
  })

  it('propaga ApiError com todas as mensagens do backend', async () => {
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Dados inválidos',
        mensagens: ['O nome é obrigatório', 'A senha deve ter no mínimo 8 caracteres'],
        caminho: '/api/auth/register',
      },
    })

    await expect(registerUser(PAYLOAD)).rejects.toMatchObject({
      status: 400,
      messages: ['O nome é obrigatório', 'A senha deve ter no mínimo 8 caracteres'],
    })
  })
})
