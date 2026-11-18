import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'

vi.mock('./api/confirmEmail.js', () => ({ confirmEmail: vi.fn() }))

import { ApiError } from '../../shared/api/errors.js'
import { confirmEmail } from './api/confirmEmail.js'
import ConfirmEmailPage from './ConfirmEmailPage.jsx'

const TOKEN = 'token-bruto-de-teste'
const MENSAGEM_LINK_INVALIDO = 'Não foi possível confirmar seu e-mail. O link é inválido ou expirou. Sua conta ainda não foi confirmada.'
const MENSAGEM_SUCESSO = 'E-mail confirmado. Entre na sua conta para continuar.'

function definirHash(hash = '') {
  window.history.replaceState(null, '', `/confirm-email${hash}`)
}

function Localizacao() {
  const location = useLocation()
  return <span data-testid="caminho">{location.pathname}</span>
}

function renderizar({ strict = false } = {}) {
  const conteudo = (
    <MemoryRouter initialEntries={['/confirm-email']}>
      <Localizacao />
      <ConfirmEmailPage />
    </MemoryRouter>
  )

  return render(strict ? <StrictMode>{conteudo}</StrictMode> : conteudo)
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
})

describe('ConfirmEmailPage', () => {
  it('apresenta estado de carregamento enquanto processa', () => {
    definirHash(`#token=${TOKEN}`)
    confirmEmail.mockImplementation(() => new Promise(() => {}))

    renderizar()

    expect(screen.getByText('Confirmando seu e-mail...')).toBeInTheDocument()
    expect(confirmEmail).toHaveBeenCalledTimes(1)
  })

  it('lê o token do fragmento, envia pelo serviço e limpa o fragmento', async () => {
    definirHash(`#token=${TOKEN}`)
    confirmEmail.mockResolvedValue(null)

    renderizar()

    await waitFor(() => expect(confirmEmail).toHaveBeenCalledWith(TOKEN))
    expect(window.location.hash).toBe('')
    expect(screen.queryByText(TOKEN)).not.toBeInTheDocument()
  })

  it('apresenta sucesso em 204 e orienta a entrar na conta', async () => {
    definirHash(`#token=${TOKEN}`)
    confirmEmail.mockResolvedValue(null)

    renderizar()

    expect(await screen.findByRole('heading', { name: 'E-mail confirmado' })).toBeInTheDocument()
    expect(screen.getByText(MENSAGEM_SUCESSO)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar na conta' })).toBeInTheDocument()
  })

  it('só navega para login após ação do usuário', async () => {
    definirHash(`#token=${TOKEN}`)
    confirmEmail.mockResolvedValue(null)

    renderizar()

    await screen.findByRole('button', { name: 'Entrar na conta' })
    expect(screen.getByTestId('caminho')).toHaveTextContent('/confirm-email')

    fireEvent.click(screen.getByRole('button', { name: 'Entrar na conta' }))

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('usa a mensagem aprovada quando o token está ausente', () => {
    renderizar()

    expect(screen.getByText(MENSAGEM_LINK_INVALIDO)).toBeInTheDocument()
    expect(confirmEmail).not.toHaveBeenCalled()
  })

  it('usa a mensagem exata aprovada em 400, sem exibir a mensagem genérica do backend', async () => {
    definirHash(`#token=${TOKEN}`)
    confirmEmail.mockRejectedValue(new ApiError({
      status: 400,
      erro: 'Regra de negócio violada',
      messages: ['O link de confirmação é inválido, expirou ou já foi utilizado.'],
      caminho: '/api/auth/confirm-email',
    }))

    renderizar()

    expect(await screen.findByText(MENSAGEM_LINK_INVALIDO)).toBeInTheDocument()
    expect(screen.queryByText('O link de confirmação é inválido, expirou ou já foi utilizado.')).not.toBeInTheDocument()
    expect(window.location.hash).toBe('')
  })

  it('exibe mensagens da API em outros erros sem indicar sucesso', async () => {
    definirHash(`#token=${TOKEN}`)
    confirmEmail.mockRejectedValue(new ApiError({
      status: 503,
      erro: 'Serviço indisponível',
      messages: ['Não foi possível enviar a confirmação.', 'Tente novamente mais tarde.'],
      caminho: '/api/auth/confirm-email',
    }))

    renderizar()

    await waitFor(() => {
      expect(screen.getByText('Não foi possível enviar a confirmação.')).toBeInTheDocument()
      expect(screen.getByText('Tente novamente mais tarde.')).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: 'E-mail confirmado' })).not.toBeInTheDocument()
    expect(window.location.hash).toBe('')
  })

  it('não cria sessão nem persiste o token após sucesso', async () => {
    definirHash(`#token=${TOKEN}`)
    confirmEmail.mockResolvedValue(null)

    renderizar()

    await screen.findByRole('heading', { name: 'E-mail confirmado' })
    expect(sessionStorage.getItem('aurora.session')).toBeNull()
    expect(sessionStorage.getItem('aurora.token')).toBeNull()
  })

  it('não dispara confirmações duplicadas sob StrictMode', async () => {
    definirHash(`#token=${TOKEN}`)
    confirmEmail.mockImplementation(() => new Promise(() => {}))

    renderizar({ strict: true })

    await act(async () => {})
    expect(confirmEmail).toHaveBeenCalledTimes(1)
  })
})
