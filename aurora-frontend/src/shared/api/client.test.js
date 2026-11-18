import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getErrorMessages } from './errors.js'
import { buildApiUrl, request, setTokenProvider, setUnauthorizedHandler } from './client.js'

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
  setUnauthorizedHandler(null)
  setTokenProvider(null)
})

describe('cliente HTTP', () => {
  it('monta URL com base padrão e prefixo /api', () => {
    expect(buildApiUrl('/auth/login')).toBe('http://localhost:8080/api/auth/login')
    expect(buildApiUrl('auth/login')).toBe('http://localhost:8080/api/auth/login')
    expect(buildApiUrl('/api/auth/login')).toBe('http://localhost:8080/api/auth/login')
  })

  it('retorna null para 204 sem corpo', async () => {
    mockFetch({ status: 204 })
    await expect(request('/auth/logout', { method: 'POST' })).resolves.toBeNull()
  })

  it('envia corpo JSON e headers padrão', async () => {
    const fetchMock = mockFetch({ status: 201, payload: { ok: true } })

    await request('/auth/register', { method: 'POST', body: { name: 'Ana' } })

    const init = fetchMock.mock.calls[0][1]
    expect(init.method).toBe('POST')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ name: 'Ana' }))
  })

  it('injeta automaticamente o token do provedor central', async () => {
    const fetchMock = mockFetch({ status: 200, payload: {} })
    setTokenProvider(() => 'token-automatico')

    await request('/financial-overview')

    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer token-automatico')
  })

  it('permite override explícito do token', async () => {
    const fetchMock = mockFetch({ status: 200, payload: {} })
    setTokenProvider(() => 'token-automatico')

    await request('/financial-overview', { token: 'token-explicito' })

    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer token-explicito')
  })

  it('transforma falha de rede em ApiError com status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(request('/financial-overview')).rejects.toMatchObject({
      status: 0,
      messages: ['Não foi possível comunicar com o servidor.'],
    })
  })

  it('lança ApiError com todas as mensagens do backend', async () => {
    mockFetch({
      status: 400,
      ok: false,
      payload: {
        status: 400,
        erro: 'Dados inválidos',
        mensagens: ['Campo obrigatório', 'Valor inválido'],
        caminho: '/api/auth/register',
      },
    })

    await expect(request('/auth/register', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 400,
      messages: ['Campo obrigatório', 'Valor inválido'],
    })
  })

  it('chama o handler de 401 fora do login', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mockFetch({ status: 401, ok: false, payload: { mensagens: ['Credenciais inválidas'] } })

    await expect(request('/financial-overview')).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('não chama o handler em 401 do login nem em 429', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    mockFetch({ status: 401, ok: false, payload: { mensagens: ['Credenciais inválidas'] } })
    await expect(request('/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiError)

    mockFetch({ status: 429, ok: false, payload: { mensagens: ['Acesso temporariamente bloqueado.'] } })
    await expect(request('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 429 })

    expect(handler).not.toHaveBeenCalled()
  })

  it('expõe as mensagens do erro', () => {
    expect(getErrorMessages(new ApiError({ status: 400, messages: ['a', 'b'] }))).toEqual(['a', 'b'])
  })
})
