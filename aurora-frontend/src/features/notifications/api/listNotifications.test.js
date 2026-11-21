import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTokenProvider } from '../../../shared/api/client.js'
import { listNotifications } from './listNotifications.js'

function mockFetch({ status, ok = status >= 200 && status < 300, payload = null }) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok,
    text: vi.fn().mockResolvedValue(payload === null ? '' : JSON.stringify(payload)),
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const RESPOSTA = {
  notifications: [
    {
      type: 'LEMBRETE_VENCIMENTO',
      description: 'A conta "Aluguel" vence em 2026-11-20.',
      createdAt: '2026-11-18T08:00:00',
    },
    {
      type: 'ALERTA_DESPESAS',
      description: 'As despesas familiares atingiram 85.00% da renda no período; o limite é 80%.',
      createdAt: '2026-11-17T08:00:00',
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
  setTokenProvider(null)
  sessionStorage.clear()
})

describe('listNotifications', () => {
  it('envia GET /notifications com o Bearer central e retorna o contrato integral', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    const result = await listNotifications()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/notifications')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers.has('Content-Type')).toBe(false)
    expect(init.headers.get('Authorization')).toBe('Bearer token-de-teste')
    expect(result).toEqual(RESPOSTA)
  })

  it('retorna lista vazia conforme o contrato do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({ status: 200, payload: { notifications: [] } })

    const result = await listNotifications()

    expect(result).toEqual({ notifications: [] })
  })

  it('propaga ApiError com as mensagens do backend', async () => {
    setTokenProvider(() => 'token-de-teste')
    mockFetch({
      status: 403,
      ok: false,
      payload: {
        status: 403,
        erro: 'Acesso negado',
        mensagens: ['Somente o Principal pode consultar as notificações.'],
        caminho: '/api/notifications',
      },
    })

    await expect(listNotifications()).rejects.toMatchObject({
      status: 403,
      messages: ['Somente o Principal pode consultar as notificações.'],
    })
  })

  it('não envia identificadores de usuário ou grupo e não altera o contrato de resposta', async () => {
    setTokenProvider(() => 'token-de-teste')
    const fetchMock = mockFetch({ status: 200, payload: RESPOSTA })

    const result = await listNotifications()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).not.toContain('userId')
    expect(url).not.toContain('familyGroupId')
    expect(init.body).toBeUndefined()
    expect(Object.keys(result)).toEqual(['notifications'])
    for (const item of result.notifications) {
      expect(Object.keys(item)).toEqual(['type', 'description', 'createdAt'])
    }
    expect(result.notifications.map((item) => item.type)).toEqual([
      'LEMBRETE_VENCIMENTO',
      'ALERTA_DESPESAS',
    ])
  })
})
