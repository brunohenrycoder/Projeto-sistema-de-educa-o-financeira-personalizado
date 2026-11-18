import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom'
import { AuthProvider } from '../shared/auth/AuthContext.jsx'
import { request } from '../shared/api/client.js'
import AppRoutes from './AppRoutes.jsx'

const SESSION_KEY = 'aurora.session'

function Localizacao() {
  const location = useLocation()
  const navigationType = useNavigationType()

  return (
    <div>
      <span data-testid="caminho">{location.pathname}</span>
      <span data-testid="tipo-navegacao">{navigationType}</span>
    </div>
  )
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe('AppRoutes', () => {
  it('limpa a sessão e redireciona com replace após 401 fora do login', async () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      accessToken: 'jwt-de-teste',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: Date.now() + 3_600_000,
      userId: 'user-1',
      familyGroupId: 'family-1',
      name: 'Ana Silva',
      email: 'ana@example.com',
      role: 'PRINCIPAL',
    }))

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: vi.fn().mockResolvedValue(JSON.stringify({ mensagens: ['Credenciais inválidas'] })),
    }))

    await act(async () => {
      await expect(request('/financial-overview')).rejects.toBeTruthy()
    })

    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
    expect(screen.getByTestId('tipo-navegacao')).toHaveTextContent('REPLACE')
  })

  it('mantém as rotas estruturais sem redirecionamento', () => {
    const caminhos = ['/register', '/login', '/confirm-email']

    for (const caminho of caminhos) {
      render(
        <MemoryRouter initialEntries={[caminho]}>
          <AuthProvider>
            <Localizacao />
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('caminho')).toHaveTextContent(caminho)
      cleanup()
    }
  })

  it('redireciona para login ao acessar a rota protegida sem sessão', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('mantém a rota protegida acessível com sessão válida', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      accessToken: 'jwt-de-teste',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: Date.now() + 3_600_000,
      userId: 'user-1',
      familyGroupId: 'family-1',
      name: 'Ana Silva',
      email: 'ana@example.com',
      role: 'PRINCIPAL',
    }))

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
  })
})
