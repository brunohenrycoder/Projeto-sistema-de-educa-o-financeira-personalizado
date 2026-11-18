import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'

vi.mock('./api/login.js', () => ({ login: vi.fn() }))

import { ApiError } from '../../shared/api/errors.js'
import { AuthProvider } from '../../shared/auth/AuthContext.jsx'
import { login } from './api/login.js'
import LoginPage from './LoginPage.jsx'

const SESSION_KEY = 'aurora.session'
const MENSAGEM_LOGOUT =
  'Sessão encerrada neste dispositivo. Não foi possível confirmar a revogação no servidor.'
const CREDENCIAIS = {
  email: 'maria@example.com',
  password: 'SenhaSegura123',
}
const RESPOSTA = {
  accessToken: 'jwt-de-teste',
  tokenType: 'Bearer',
  expiresIn: 3600,
  userId: 'u1',
  familyGroupId: 'f1',
  name: 'Maria Silva',
  email: 'maria@example.com',
  role: 'PRINCIPAL',
}

function Localizacao() {
  const location = useLocation()
  return <span data-testid="caminho">{location.pathname}</span>
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Localizacao />
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function renderizarComState(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
      <AuthProvider>
        <Localizacao />
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function preencher(dados = CREDENCIAIS) {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: dados.email } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: dados.password } })
}

function sessaoValida() {
  return JSON.stringify({
    ...RESPOSTA,
    accessToken: 'jwt-preexistente',
    expiresAt: Date.now() + 3_600_000,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.useRealTimers()
})

describe('LoginPage', () => {
  it('renderiza os campos de e-mail e senha', () => {
    renderizar()

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('exibe erros de campos obrigatórios sem chamar a API', () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('valida o formato do e-mail', () => {
    renderizar()

    preencher({ email: 'email-invalido', password: CREDENCIAIS.password })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('envia exatamente e-mail e senha', async () => {
    login.mockResolvedValue(RESPOSTA)
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(login).toHaveBeenCalledWith(CREDENCIAIS))
  })

  it('mostra carregamento e impede envio duplicado', () => {
    login.mockImplementation(() => new Promise(() => {}))
    renderizar()

    preencher()
    const botao = screen.getByRole('button', { name: 'Entrar' })
    fireEvent.click(botao)

    expect(screen.getByText('Entrando...')).toBeInTheDocument()
    expect(botao).toBeDisabled()
    fireEvent.click(botao)
    expect(login).toHaveBeenCalledTimes(1)
  })

  it('cria a sessão pelo AuthContext e redireciona para /', async () => {
    login.mockResolvedValue(RESPOSTA)
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/'))

    const gravada = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    expect(gravada).toMatchObject({
      accessToken: 'jwt-de-teste',
      tokenType: 'Bearer',
      expiresIn: 3600,
      userId: 'u1',
      familyGroupId: 'f1',
      name: 'Maria Silva',
      email: 'maria@example.com',
      role: 'PRINCIPAL',
    })
    expect(gravada.expiresAt).toBeGreaterThan(Date.now() + 3_500_000)
  })

  it('exibe mensagem genérica em 401 sem criar sessão', async () => {
    login.mockRejectedValue(new ApiError({
      status: 401,
      erro: 'Falha na autenticação',
      messages: ['E-mail ou senha inválidos.'],
      caminho: '/api/auth/login',
    }))
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('exibe a mensagem do backend em 429 sem criar sessão', async () => {
    const mensagem = 'Acesso temporariamente bloqueado. Tente novamente após 18/11/2026 às 16:00.'
    login.mockRejectedValue(new ApiError({
      status: 429,
      erro: 'Acesso temporariamente bloqueado',
      messages: [mensagem],
      caminho: '/api/auth/login',
    }))
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText(mensagem)).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.queryByText('E-mail ou senha inválidos.')).not.toBeInTheDocument()
  })

  it.each([
    [401, 'E-mail ou senha inválidos.'],
    [429, 'Acesso temporariamente bloqueado. Tente novamente mais tarde.'],
  ])('não limpa uma sessão válida em falha %i', async (status, mensagem) => {
    const gravada = sessaoValida()
    sessionStorage.setItem(SESSION_KEY, gravada)
    login.mockRejectedValue(new ApiError({
      status,
      erro: 'Falha',
      messages: [mensagem],
      caminho: '/api/auth/login',
    }))
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText(mensagem)).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_KEY)).toBe(gravada)
    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('exibe mensagens de outros erros da API', async () => {
    login.mockRejectedValue(new ApiError({
      status: 503,
      erro: 'Serviço indisponível',
      messages: ['Não foi possível entrar.', 'Tente novamente mais tarde.'],
      caminho: '/api/auth/login',
    }))
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(screen.getByText('Não foi possível entrar.')).toBeInTheDocument()
      expect(screen.getByText('Tente novamente mais tarde.')).toBeInTheDocument()
    })
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('exibe o aviso de logout recebido via location.state', async () => {
    renderizarComState({ logoutNotice: MENSAGEM_LOGOUT })

    expect(await screen.findByRole('status')).toHaveTextContent(MENSAGEM_LOGOUT)
    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('mantém o aviso em status, distinto dos erros da API em alert', async () => {
    login.mockRejectedValue(new ApiError({
      status: 401,
      erro: 'Falha na autenticação',
      messages: ['E-mail ou senha inválidos.'],
      caminho: '/api/auth/login',
    }))
    renderizarComState({ logoutNotice: MENSAGEM_LOGOUT })

    expect(await screen.findByRole('status')).toHaveTextContent(MENSAGEM_LOGOUT)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
    expect(screen.getByRole('alert')).not.toHaveTextContent(MENSAGEM_LOGOUT)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('não exibe aviso quando não há logoutNotice no state', () => {
    renderizar()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('limpa o aviso ao iniciar um novo envio', async () => {
    login.mockImplementation(() => new Promise(() => {}))
    renderizarComState({ logoutNotice: MENSAGEM_LOGOUT })
    expect(await screen.findByRole('status')).toHaveTextContent(MENSAGEM_LOGOUT)

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('anuncia o aviso após a montagem, não no primeiro render', async () => {
    const state = { logoutNotice: MENSAGEM_LOGOUT }
    const html = renderToString(
      <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(html).not.toContain('role="status"')
    expect(html).not.toContain(MENSAGEM_LOGOUT)

    renderizarComState(state)
    expect(await screen.findByRole('status')).toHaveTextContent(MENSAGEM_LOGOUT)
  })

  it('cancela o timer do aviso ao desmontar', () => {
    vi.useFakeTimers()
    const { unmount } = renderizarComState({ logoutNotice: MENSAGEM_LOGOUT })

    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('não reapresenta o aviso se o envio começar antes do timer', () => {
    vi.useFakeTimers()
    login.mockImplementation(() => new Promise(() => {}))
    renderizarComState({ logoutNotice: MENSAGEM_LOGOUT })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(login).toHaveBeenCalledTimes(1)
  })
})
