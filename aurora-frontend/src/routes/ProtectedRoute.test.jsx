import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '../shared/auth/AuthContext.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

const SESSION_KEY = 'aurora.session'
const SESSAO_BASE = {
  accessToken: 'jwt-de-teste',
  tokenType: 'Bearer',
  expiresIn: 3600,
  userId: 'user-1',
  familyGroupId: 'family-1',
  name: 'Ana Silva',
  email: 'ana@example.com',
}

function session(role) {
  return JSON.stringify({ ...SESSAO_BASE, role, expiresAt: Date.now() + 3600_000 })
}

function TelaLogin() {
  const location = useLocation()
  return (
    <div>
      <span>tela de login</span>
      <span data-testid="origem">{location.state?.from?.pathname ?? ''}</span>
    </div>
  )
}

function setup(caminho = '/restrito') {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<div>início</div>} />
          <Route
            path="/restrito"
            element={
              <ProtectedRoute roles={['PRINCIPAL']}>
                <div>conteúdo restrito</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<TelaLogin />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe('ProtectedRoute', () => {
  it('encaminha para login sem sessão', () => {
    setup()
    expect(screen.getByText('tela de login')).toBeInTheDocument()
  })

  it('preserva a origem no state ao encaminhar para login', () => {
    setup('/restrito')
    expect(screen.getByText('tela de login')).toBeInTheDocument()
    expect(screen.getByTestId('origem')).toHaveTextContent('/restrito')
  })

  it('preserva a origem mesmo com query string na rota protegida', () => {
    setup('/restrito?aba=resumo')
    expect(screen.getByTestId('origem')).toHaveTextContent('/restrito')
  })

  it('libera o conteúdo para o perfil permitido', () => {
    sessionStorage.setItem(SESSION_KEY, session('PRINCIPAL'))
    setup()
    expect(screen.getByText('conteúdo restrito')).toBeInTheDocument()
  })

  it('redireciona perfil não permitido', () => {
    sessionStorage.setItem(SESSION_KEY, session('DEPENDENTE'))
    setup()
    expect(screen.getByText('início')).toBeInTheDocument()
  })
})
