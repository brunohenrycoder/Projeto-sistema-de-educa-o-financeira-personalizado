import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

vi.mock('./api/logout.js', () => ({ logout: vi.fn() }))

import { ApiError } from '../../shared/api/errors.js'
import { AuthProvider, useAuth } from '../../shared/auth/AuthContext.jsx'
import LoginPage from './LoginPage.jsx'
import { logout } from './api/logout.js'
import LogoutButton from './LogoutButton.jsx'

const SESSION_KEY = 'aurora.session'
const TOKEN = 'jwt-de-teste'
const MENSAGEM_FALHA_REVOGACAO =
  'Sessão encerrada neste dispositivo. Não foi possível confirmar a revogação no servidor.'

function sessaoValida() {
  return JSON.stringify({
    accessToken: TOKEN,
    tokenType: 'Bearer',
    expiresIn: 3600,
    expiresAt: Date.now() + 3_600_000,
    userId: 'u1',
    familyGroupId: 'f1',
    name: 'Ana Silva',
    email: 'ana@example.com',
    role: 'PRINCIPAL',
  })
}

function Localizacao() {
  const location = useLocation()
  const { encerrando } = useAuth()
  return (
    <div>
      <span data-testid="caminho">{location.pathname}</span>
      <span data-testid="encerrando">{String(encerrando)}</span>
    </div>
  )
}

function ConteudoProtegido() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return null
  return (
    <>
      <span>conteúdo protegido</span>
      <LogoutButton />
    </>
  )
}

function Rotas() {
  return (
    <>
      <Localizacao />
      <Routes>
        <Route path="/" element={<ConteudoProtegido />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </>
  )
}

function renderizarComSessao() {
  sessionStorage.setItem(SESSION_KEY, sessaoValida())
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Rotas />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  logout.mockReset()
  sessionStorage.clear()
})

describe('LogoutButton', () => {
  it('com sessão ativa, chama o serviço, encerra a sessão e navega para login', async () => {
    logout.mockResolvedValue({ revoked: true, attempted: true })
    renderizarComSessao()

    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bom ter você aqui.' })).toBeInTheDocument())
    expect(logout).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    await waitFor(() => expect(screen.getByTestId('encerrando')).toHaveTextContent('false'))
    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('em erro de rede, encerra a sessão e avisa que a revogação não foi confirmada', async () => {
    logout.mockRejectedValue(new Error('offline'))
    renderizarComSessao()

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('status')).toHaveTextContent(MENSAGEM_FALHA_REVOGACAO)
    expect(screen.getByRole('heading', { name: 'Bom ter você aqui.' })).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.getByTestId('encerrando')).toHaveTextContent('false')
    expect(screen.queryByText(/revogação confirmada/i)).not.toBeInTheDocument()
  })

  it('em erro HTTP, encerra a sessão e avisa que a revogação não foi confirmada', async () => {
    logout.mockRejectedValue(new ApiError({
      status: 500,
      erro: 'Erro interno',
      messages: ['Não foi possível revogar a sessão no servidor.'],
      caminho: '/api/auth/logout',
    }))
    renderizarComSessao()

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('status')).toHaveTextContent(MENSAGEM_FALHA_REVOGACAO)
    expect(screen.getByRole('heading', { name: 'Bom ter você aqui.' })).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.getByTestId('encerrando')).toHaveTextContent('false')
    expect(screen.queryByText(/revogação confirmada/i)).not.toBeInTheDocument()
  })

  it('sem sessão ativa, não chama o serviço', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LogoutButton />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(logout).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('cliques repetidos não geram chamadas concorrentes', () => {
    logout.mockImplementation(() => new Promise(() => {}))
    renderizarComSessao()

    const botao = screen.getByRole('button', { name: 'Sair' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(logout).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Saindo...')).toBeInTheDocument()
    expect(botao).toBeDisabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('segundo clique não gera aviso adicional', async () => {
    logout.mockRejectedValue(new Error('offline'))
    renderizarComSessao()

    const botao = screen.getByRole('button', { name: 'Sair' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(logout).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('status')).toHaveTextContent(MENSAGEM_FALHA_REVOGACAO)
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('limpa o flag mesmo sem montar a LoginPage após a navegação', async () => {
    logout.mockResolvedValue({ revoked: true, attempted: true })
    sessionStorage.setItem(SESSION_KEY, sessaoValida())

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Localizacao />
          <Routes>
            <Route path="/" element={<ConteudoProtegido />} />
            <Route path="/login" element={<div>tela de login</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/login'))
    expect(screen.getByText('tela de login')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('encerrando')).toHaveTextContent('false'))
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('não exibe nem registra o JWT', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logout.mockResolvedValue({ revoked: true, attempted: true })
    renderizarComSessao()

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bom ter você aqui.' })).toBeInTheDocument())
    expect(screen.queryByText(TOKEN)).not.toBeInTheDocument()
    ;[log, error, warn].forEach((espião) => {
      espião.mock.calls.forEach((argumentos) => {
        expect(JSON.stringify(argumentos)).not.toContain(TOKEN)
      })
    })
  })
})
