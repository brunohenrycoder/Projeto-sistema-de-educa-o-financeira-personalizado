import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import { request } from '../api/client.js'

vi.mock('../../features/auth/api/logout.js', () => ({ logout: vi.fn() }))

import { logout as logoutRequest } from '../../features/auth/api/logout.js'

const SESSION_KEY = 'aurora.session'
const SESSION = {
  accessToken: 'jwt-de-teste',
  tokenType: 'Bearer',
  expiresIn: 3600,
  userId: 'user-1',
  familyGroupId: 'family-1',
  name: 'Ana Silva',
  email: 'ana@example.com',
  role: 'PRINCIPAL',
}

function Consumer() {
  const { isAuthenticated, user, hasRole, unauthorized, encerrando, login, logout, fimLogout } = useAuth()
  const [resultado, setResultado] = useState(null)

  return (
    <div>
      <span data-testid="autenticado">{String(isAuthenticated)}</span>
      <span data-testid="nome">{user?.name ?? ''}</span>
      <span data-testid="perfil">{user?.role ?? ''}</span>
      <span data-testid="principal">{String(hasRole('PRINCIPAL'))}</span>
      <span data-testid="nao-autorizado">{String(unauthorized)}</span>
      <span data-testid="encerrando">{String(encerrando)}</span>
      <span data-testid="resultado-logout">{JSON.stringify(resultado)}</span>
      <button type="button" onClick={() => login(SESSION)}>entrar</button>
      <button type="button" onClick={fimLogout}>fim logout</button>
      <button
        type="button"
        onClick={async () => {
          const retorno = await logout()
          setResultado(retorno)
        }}
      >
        sair
      </button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  logoutRequest.mockReset()
})

describe('AuthContext', () => {
  it('começa sem sessão', () => {
    render(<AuthProvider><Consumer /></AuthProvider>)
    expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
  })

  it('armazena a sessão no sessionStorage e expõe os dados', () => {
    render(<AuthProvider><Consumer /></AuthProvider>)

    act(() => screen.getByText('entrar').click())

    expect(screen.getByTestId('autenticado')).toHaveTextContent('true')
    expect(screen.getByTestId('nome')).toHaveTextContent('Ana Silva')
    expect(screen.getByTestId('perfil')).toHaveTextContent('PRINCIPAL')
    expect(screen.getByTestId('principal')).toHaveTextContent('true')
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('jwt-de-teste')
  })

  it('chama o serviço e limpa a sessão no logout', async () => {
    logoutRequest.mockResolvedValue(null)
    render(<AuthProvider><Consumer /></AuthProvider>)

    fireEvent.click(screen.getByText('entrar'))
    await waitFor(() => expect(sessionStorage.getItem(SESSION_KEY)).toContain('jwt-de-teste'))

    fireEvent.click(screen.getByText('sair'))

    await waitFor(() => expect(sessionStorage.getItem(SESSION_KEY)).toBeNull())
    expect(logoutRequest).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
    expect(screen.getByTestId('resultado-logout')).toHaveTextContent(
      JSON.stringify({ revoked: true, attempted: true }),
    )
  })

  it('limpa a sessão mesmo quando o logout falha', async () => {
    logoutRequest.mockRejectedValue(new Error('falha de rede'))
    render(<AuthProvider><Consumer /></AuthProvider>)

    fireEvent.click(screen.getByText('entrar'))
    await waitFor(() => expect(sessionStorage.getItem(SESSION_KEY)).toContain('jwt-de-teste'))

    fireEvent.click(screen.getByText('sair'))

    await waitFor(() => expect(sessionStorage.getItem(SESSION_KEY)).toBeNull())
    expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
    expect(screen.getByTestId('resultado-logout')).toHaveTextContent(
      JSON.stringify({ revoked: false, attempted: true }),
    )
  })

  it('expõe o flag encerrando apenas durante o logout', async () => {
    let resolver
    logoutRequest.mockImplementation(() => new Promise((resolve) => { resolver = resolve }))
    render(<AuthProvider><Consumer /></AuthProvider>)

    fireEvent.click(screen.getByText('entrar'))
    await waitFor(() => expect(sessionStorage.getItem(SESSION_KEY)).toContain('jwt-de-teste'))
    expect(screen.getByTestId('encerrando')).toHaveTextContent('false')

    fireEvent.click(screen.getByText('sair'))
    expect(screen.getByTestId('encerrando')).toHaveTextContent('true')

    await act(async () => { resolver(null) })

    await waitFor(() => expect(screen.getByTestId('resultado-logout')).toHaveTextContent(
      JSON.stringify({ revoked: true, attempted: true }),
    ))
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    // O flag só cai quando o destino pós-logout confirma a navegação (fimLogout).
    expect(screen.getByTestId('encerrando')).toHaveTextContent('true')
    fireEvent.click(screen.getByText('fim logout'))
    expect(screen.getByTestId('encerrando')).toHaveTextContent('false')
  })

  it('limpa flag residual de logout no início de um novo login', async () => {
    logoutRequest.mockResolvedValue(null)
    render(<AuthProvider><Consumer /></AuthProvider>)

    fireEvent.click(screen.getByText('entrar'))
    await waitFor(() => expect(screen.getByTestId('autenticado')).toHaveTextContent('true'))

    fireEvent.click(screen.getByText('sair'))
    await waitFor(() => expect(screen.getByTestId('resultado-logout')).toHaveTextContent(
      JSON.stringify({ revoked: true, attempted: true }),
    ))
    expect(screen.getByTestId('encerrando')).toHaveTextContent('true')

    fireEvent.click(screen.getByText('entrar'))
    expect(screen.getByTestId('encerrando')).toHaveTextContent('false')
    expect(screen.getByTestId('autenticado')).toHaveTextContent('true')
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('jwt-de-teste')
  })

  it('não chama o serviço quando não há sessão ativa', async () => {
    render(<AuthProvider><Consumer /></AuthProvider>)

    fireEvent.click(screen.getByText('sair'))

    expect(logoutRequest).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    await waitFor(() => expect(screen.getByTestId('resultado-logout')).toHaveTextContent(
      JSON.stringify({ revoked: false, attempted: false }),
    ))
  })

  it('não dispara logouts concorrentes', async () => {
    logoutRequest.mockImplementation(() => new Promise(() => {}))
    render(<AuthProvider><Consumer /></AuthProvider>)

    fireEvent.click(screen.getByText('entrar'))
    await waitFor(() => expect(sessionStorage.getItem(SESSION_KEY)).toContain('jwt-de-teste'))

    const botaoSair = screen.getByText('sair')
    fireEvent.click(botaoSair)
    fireEvent.click(botaoSair)

    expect(logoutRequest).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByTestId('resultado-logout')).toHaveTextContent(
      JSON.stringify({ revoked: false, duplicates: true, attempted: false }),
    ))
  })

  it('remove do sessionStorage uma sessão já expirada na hidratação', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      ...SESSION,
      expiresAt: Date.now() - 1000,
    }))

    render(<AuthProvider><Consumer /></AuthProvider>)

    expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('expira a sessão com a página aberta usando o expiresAt', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-18T15:00:00Z'))

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      ...SESSION,
      expiresAt: Date.now() + 1000,
    }))

    render(<AuthProvider><Consumer /></AuthProvider>)
    expect(screen.getByTestId('autenticado')).toHaveTextContent('true')

    act(() => {
      vi.advanceTimersByTime(1001)
    })

    expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
    expect(screen.getByTestId('nome')).toHaveTextContent('')
    expect(screen.getByTestId('principal')).toHaveTextContent('false')
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('verifica a expiração quando a aba volta a ficar visível', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-18T15:00:00Z'))

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      ...SESSION,
      expiresAt: Date.now() + 5000,
    }))

    render(<AuthProvider><Consumer /></AuthProvider>)
    expect(screen.getByTestId('autenticado')).toHaveTextContent('true')

    vi.setSystemTime(new Date('2026-11-18T15:00:10Z'))
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('limpa a sessão e sinaliza não autorizado em 401 fora do login', async () => {
    render(<AuthProvider><Consumer /></AuthProvider>)

    act(() => screen.getByText('entrar').click())
    expect(screen.getByTestId('autenticado')).toHaveTextContent('true')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: vi.fn().mockResolvedValue(JSON.stringify({ mensagens: ['Credenciais inválidas'] })),
    }))

    await act(async () => {
      await expect(request('/financial-overview')).rejects.toBeTruthy()
    })

    expect(screen.getByTestId('autenticado')).toHaveTextContent('false')
    expect(screen.getByTestId('nao-autorizado')).toHaveTextContent('true')
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('em 401 no logout não sinaliza não autorizado e devolve tentativa sem revogação', async () => {
    logoutRequest.mockImplementation(() => request('/auth/logout', { method: 'POST' }))

    render(<AuthProvider><Consumer /></AuthProvider>)

    fireEvent.click(screen.getByText('entrar'))
    await waitFor(() => expect(sessionStorage.getItem(SESSION_KEY)).toContain('jwt-de-teste'))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: vi.fn().mockResolvedValue(JSON.stringify({ mensagens: ['Sessão revogada'] })),
    }))

    fireEvent.click(screen.getByText('sair'))

    await waitFor(() => expect(screen.getByTestId('resultado-logout')).toHaveTextContent(
      JSON.stringify({ revoked: false, attempted: true }),
    ))
    expect(screen.getByTestId('nao-autorizado')).toHaveTextContent('false')
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toContain('/api/auth/logout')
    expect(logoutRequest).toHaveBeenCalledTimes(1)
  })
})
