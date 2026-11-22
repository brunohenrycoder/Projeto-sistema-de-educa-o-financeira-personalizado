import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

vi.mock('../features/auth/api/login.js', () => ({ login: vi.fn() }))
vi.mock('../features/auth/api/registerUser.js', () => ({ registerUser: vi.fn() }))
vi.mock('../features/auth/api/confirmEmail.js', () => ({ confirmEmail: vi.fn() }))
vi.mock('../features/auth/api/logout.js', () => ({ logout: vi.fn() }))
vi.mock('../features/payablebills/api/listPayableBills.js', () => ({
  listPayableBills: vi.fn(() => Promise.resolve({ bills: [] })),
}))
vi.mock('../features/expenses/api/listExpenses.js', () => ({
  listExpenses: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../features/financialgoals/api/getSavingsSuggestion.js', () => ({
  getSavingsSuggestion: vi.fn(() => Promise.resolve(null)),
}))
vi.mock('../features/financialgoals/api/listGoals.js', () => ({
  listGoals: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../features/financialoverview/api/getFinancialOverview.js', () => ({
  getFinancialOverview: vi.fn(() => Promise.resolve({
    period: '2026-11',
    realizedIncome: 0,
    plannedIncome: 0,
    realizedExpenses: 0,
    plannedExpenses: 0,
    projectedBalance: 0,
    incomeConsidered: 0,
    expensesConsidered: 0,
    commitmentPercent: null,
    alertThresholdPercent: 80,
    thresholdReached: false,
    alert: null,
  })),
}))

import { ApiError } from '../shared/api/errors.js'
import { AuthProvider, useAuth } from '../shared/auth/AuthContext.jsx'
import { login } from '../features/auth/api/login.js'
import { registerUser } from '../features/auth/api/registerUser.js'
import { confirmEmail } from '../features/auth/api/confirmEmail.js'
import { logout } from '../features/auth/api/logout.js'
import LogoutButton from '../features/auth/LogoutButton.jsx'
import AppRoutes from './AppRoutes.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

const SESSION_KEY = 'aurora.session'
const MENSAGEM_HOME = 'Autenticação realizada. Você está na sua conta Aurora.'
const SUCESSO_CADASTRO = 'Cadastro realizado. Verifique seu e-mail para confirmar sua conta.'
const MENSAGEM_LINK_INVALIDO =
  'Não foi possível confirmar seu e-mail. O link é inválido ou expirou. Sua conta ainda não foi confirmada.'
const MENSAGEM_FALHA_REVOGACAO =
  'Sessão encerrada neste dispositivo. Não foi possível confirmar a revogação no servidor.'

const RESPOSTA_LOGIN = {
  accessToken: 'jwt-de-teste',
  tokenType: 'Bearer',
  expiresIn: 3600,
  userId: 'u1',
  familyGroupId: 'f1',
  name: 'Maria Silva',
  email: 'maria@example.com',
  role: 'PRINCIPAL',
}

function sessaoValida(role = 'PRINCIPAL') {
  return JSON.stringify({
    ...RESPOSTA_LOGIN,
    role,
    expiresAt: Date.now() + 3_600_000,
  })
}

function Localizacao() {
  const location = useLocation()
  const { encerrando } = useAuth()
  return (
    <div>
      <span data-testid="caminho">{location.pathname}</span>
      <span data-testid="encerrando">{String(encerrando)}</span>
      <span data-testid="aviso-state">{location.state?.logoutNotice ?? ''}</span>
      <span data-testid="from-state">{location.state?.from?.pathname ?? ''}</span>
    </div>
  )
}

function renderizarApp(caminho = '/') {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <AuthProvider>
        <Localizacao />
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function definirHash(hash = '') {
  window.history.replaceState(null, '', `/confirm-email${hash}`)
}

function renderizarConfirmacao() {
  return render(
    <MemoryRouter initialEntries={['/confirm-email']}>
      <AuthProvider>
        <Localizacao />
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function preencherCadastro() {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria Silva' } })
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'maria@example.com' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaSegura123' } })
  fireEvent.change(screen.getByLabelText('Confirmação de senha'), {
    target: { value: 'SenhaSegura123' },
  })
}

function preencherLogin() {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'maria@example.com' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaSegura123' } })
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  definirHash('')
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  vi.useRealTimers()
})

describe('Fluxo de autenticação entre páginas e rotas', () => {
  it('cadastro válido orienta a confirmar o e-mail sem criar sessão', async () => {
    registerUser.mockResolvedValue({ userId: 'u1', role: 'PRINCIPAL' })
    renderizarApp('/register')

    preencherCadastro()
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByRole('status')).toHaveTextContent(SUCESSO_CADASTRO)
    expect(registerUser).toHaveBeenCalledWith({
      name: 'Maria Silva',
      email: 'maria@example.com',
      password: 'SenhaSegura123',
      passwordConfirmation: 'SenhaSegura123',
    })
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/confirm-email'))
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('e-mail duplicado exibe a mensagem do backend', async () => {
    registerUser.mockRejectedValue(new ApiError({
      status: 409,
      erro: 'Conflito de dados',
      messages: ['Já existe um usuário cadastrado com este e-mail.'],
      caminho: '/api/auth/register',
    }))
    renderizarApp('/register')

    preencherCadastro()
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Já existe um usuário cadastrado com este e-mail.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/register')
  })

  it('confirmação válida orienta o login e o botão navega para /login', async () => {
    definirHash('#token=token-valido')
    confirmEmail.mockResolvedValue(null)
    renderizarConfirmacao()

    expect(await screen.findByRole('heading', { name: 'E-mail confirmado.' })).toBeInTheDocument()
    expect(confirmEmail).toHaveBeenCalledWith('token-valido')
    expect(screen.getByTestId('caminho')).toHaveTextContent('/confirm-email')

    fireEvent.click(screen.getByRole('button', { name: 'Entrar na conta' }))

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
    expect(screen.getByRole('heading', { name: 'Bom ter você aqui.' })).toBeInTheDocument()
  })

  it('link inválido mantém a mensagem aprovada e não navega', async () => {
    definirHash('#token=token-invalido')
    confirmEmail.mockRejectedValue(new ApiError({
      status: 400,
      erro: 'Regra de negócio violada',
      messages: ['O link de confirmação é inválido, expirou ou já foi utilizado.'],
      caminho: '/api/auth/confirm-email',
    }))
    renderizarConfirmacao()

    expect(await screen.findByText(MENSAGEM_LINK_INVALIDO)).toBeInTheDocument()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/confirm-email')
  })

  it.each([
    [401, 'E-mail ou senha inválidos.'],
    [429, 'Acesso temporariamente bloqueado. Tente novamente às 16:00.'],
  ])('login com falha %i exibe a mensagem da API sem criar sessão', async (status, mensagem) => {
    login.mockRejectedValue(new ApiError({
      status,
      erro: 'Falha na autenticação',
      messages: [mensagem],
      caminho: '/api/auth/login',
    }))
    renderizarApp('/login')

    preencherLogin()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText(mensagem)).toBeInTheDocument()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('rota protegida sem sessão encaminha para login preservando from.pathname', async () => {
    renderizarApp('/')

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/login'))
    expect(screen.getByTestId('from-state')).toHaveTextContent('/')
    expect(screen.queryByText(MENSAGEM_HOME)).not.toBeInTheDocument()
  })

  it('login válido cria a sessão e retorna para a rota de origem', async () => {
    login.mockResolvedValue(RESPOSTA_LOGIN)
    renderizarApp('/')

    await waitFor(() => expect(screen.getByTestId('from-state')).toHaveTextContent('/'))
    preencherLogin()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/'))
    expect(await screen.findByText(MENSAGEM_HOME)).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('jwt-de-teste')
  })

  it('login duplo envio não gera chamadas concorrentes', () => {
    login.mockImplementation(() => new Promise(() => {}))
    renderizarApp('/login')

    preencherLogin()
    const botao = screen.getByRole('button', { name: 'Entrar' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(login).toHaveBeenCalledTimes(1)
    expect(botao).toBeDisabled()
  })

  it('sessão expirada limpa o storage e redireciona para login', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-18T15:00:00Z'))
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      ...RESPOSTA_LOGIN,
      expiresAt: Date.now() + 1000,
    }))

    renderizarApp('/')
    expect(screen.getByText(MENSAGEM_HOME)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1001)
    })

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('perfil não autorizado é redirecionado da rota restrita', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/restrito']}>
        <AuthProvider>
          <Localizacao />
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
            <Route path="/login" element={<div>login</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('início')).toBeInTheDocument()
  })

  it('perfil autorizado acessa a rota restrita', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/restrito']}>
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
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('conteúdo restrito')).toBeInTheDocument()
  })
})

describe('Logout integrado à rota protegida', () => {
  it('revogação confirmada encerra a sessão sem aviso', async () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida())
    logout.mockResolvedValue(null)
    renderizarApp('/')

    expect(screen.getByText(MENSAGEM_HOME)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/login'))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByTestId('aviso-state')).toBeEmptyDOMElement()
  })

  it('falha de rede limpa a sessão e preserva o aviso no redirecionamento', async () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida())
    logout.mockRejectedValue(new Error('offline'))
    renderizarApp('/')

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('status')).toHaveTextContent(MENSAGEM_FALHA_REVOGACAO)
    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
    expect(screen.getByTestId('aviso-state')).toHaveTextContent(MENSAGEM_FALHA_REVOGACAO)
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('falha HTTP 500 também preserva o aviso', async () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida())
    logout.mockRejectedValue(new ApiError({
      status: 500,
      erro: 'Erro interno',
      messages: ['Não foi possível revogar a sessão no servidor.'],
      caminho: '/api/auth/logout',
    }))
    renderizarApp('/')

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('status')).toHaveTextContent(MENSAGEM_FALHA_REVOGACAO)
    expect(screen.getByTestId('aviso-state')).toHaveTextContent(MENSAGEM_FALHA_REVOGACAO)
  })

  it('a rota protegida não redireciona enquanto a revogação está em andamento', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida())
    logout.mockImplementation(() => new Promise(() => {}))
    renderizarApp('/')

    const botao = screen.getByRole('button', { name: 'Sair' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(logout).toHaveBeenCalledTimes(1)
    expect(botao).toBeDisabled()
    expect(screen.getByText('Saindo...')).toBeInTheDocument()
    expect(screen.getByText(MENSAGEM_HOME)).toBeInTheDocument()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
    expect(sessionStorage.getItem(SESSION_KEY)).not.toBeNull()
  })

  it('recupera o flag sem a LoginPage e volta a proteger a rota', async () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida())
    logout.mockResolvedValue(null)

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Localizacao />
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div>
                    <span>{MENSAGEM_HOME}</span>
                    <LogoutButton />
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <div>
                  <span>tela de login</span>
                  <Link to="/">ir para início</Link>
                </div>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(MENSAGEM_HOME)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/login'))
    await waitFor(() => expect(screen.getByTestId('encerrando')).toHaveTextContent('false'))
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('ir para início'))

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/login'))
    expect(screen.getByText('tela de login')).toBeInTheDocument()
    expect(screen.queryByText(MENSAGEM_HOME)).not.toBeInTheDocument()
  })

  it('sem sessão ativa o logout não chama a API', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Localizacao />
          <Routes>
            <Route path="/" element={<LogoutButton />} />
            <Route path="/login" element={<div>tela de login</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(logout).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/login'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
