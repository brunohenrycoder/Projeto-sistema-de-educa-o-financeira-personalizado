import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { updateMember } from './updateMember.js'

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

describe('updateMember', () => {
  it('envia PUT com o memberId na URL, o payload do contrato e o Bearer central', async () => {
    const resposta = {
      id: 'u1',
      name: 'Novo Nome',
      email: 'novo@example.com',
      role: 'DEPENDENTE',
      status: 'ATIVO',
      createdAt: '2026-11-18T10:30:00',
    }
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: resposta })

    const result = await updateMember('u1', {
      name: 'Novo Nome',
      email: 'novo@example.com',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/familymanagement/members/u1')
    expect(init.method).toBe('PUT')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(JSON.parse(init.body)).toEqual({ name: 'Novo Nome', email: 'novo@example.com' })
    expect(result).toEqual(resposta)
  })

  it('propaga ApiError com todas as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 404,
      ok: false,
      payload: {
        status: 404,
        erro: 'Integrante não encontrado',
        mensagens: ['Integrante não encontrado no grupo familiar.'],
        caminho: '/api/familymanagement/members/u1',
      },
    })

    await expect(updateMember('u1', { name: 'Novo Nome' })).rejects.toMatchObject({
      status: 404,
      messages: ['Integrante não encontrado no grupo familiar.'],
    })
  })
})
