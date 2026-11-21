import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { inviteDependent } from './inviteDependent.js'

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

describe('inviteDependent', () => {
  it('envia POST com o e-mail e o Bearer do provedor central e retorna o convite', async () => {
    const resposta = {
      inviteId: 'i1',
      familyGroupId: 'f1',
      invitedEmail: 'filho@example.com',
      status: 'PENDENTE',
      createdAt: '2026-11-18T10:00:00',
      expiresAt: '2026-11-20T10:00:00',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 201, payload: resposta })

    const result = await inviteDependent({ email: 'filho@example.com' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/familymanagement/invite')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({ email: 'filho@example.com' })
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
        mensagens: ['O e-mail informado é inválido.'],
        caminho: '/api/familymanagement/invite',
      },
    })

    await expect(inviteDependent({ email: 'invalido' })).rejects.toMatchObject({
      status: 400,
      messages: ['O e-mail informado é inválido.'],
    })
  })
})
