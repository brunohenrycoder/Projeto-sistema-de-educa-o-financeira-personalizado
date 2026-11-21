import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { acceptInvite } from './acceptInvite.js'

const PAYLOAD = {
  token: 'token-extraido-da-url',
  email: 'filho@example.com',
  name: 'Pedro Silva',
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

describe('acceptInvite', () => {
  it('envia POST público com o payload do contrato, sem Authorization e sem expor o token na URL', async () => {
    const resposta = {
      userId: 'u1',
      familyGroupId: 'f1',
      name: 'Pedro Silva',
      email: 'filho@example.com',
      role: 'DEPENDENTE',
      status: 'ATIVO',
      emailConfirmed: true,
      createdAt: '2026-11-18T10:30:00',
    }
    const fetchMock = mockFetch({ status: 201, payload: resposta })

    const result = await acceptInvite(PAYLOAD)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/familymanagement/accept-invite')
    expect(url).not.toContain(PAYLOAD.token)
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.has('Authorization')).toBe(false)
    expect(JSON.parse(init.body)).toEqual(PAYLOAD)
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError com todas as mensagens do backend', async () => {
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Convite inválido',
        mensagens: ['O convite informado é inválido ou não existe.'],
        caminho: '/api/familymanagement/accept-invite',
      },
    })

    await expect(acceptInvite(PAYLOAD)).rejects.toMatchObject({
      status: 400,
      messages: ['O convite informado é inválido ou não existe.'],
    })
  })
})
