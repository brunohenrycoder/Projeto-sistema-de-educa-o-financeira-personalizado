import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'

vi.mock('./api/registerUser.js', () => ({ registerUser: vi.fn() }))

import { ApiError } from '../../shared/api/errors.js'
import { registerUser } from './api/registerUser.js'
import RegisterPage from './RegisterPage.jsx'

const DADOS = {
  name: 'Maria Silva',
  email: 'maria@example.com',
  password: 'SenhaSegura123',
  passwordConfirmation: 'SenhaSegura123',
}

const SUCESSO = 'Cadastro realizado. Verifique seu e-mail para confirmar sua conta.'

function Localizacao() {
  const location = useLocation()
  return <span data-testid="caminho">{location.pathname}</span>
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Localizacao />
      <RegisterPage />
    </MemoryRouter>,
  )
}

function preencher(dados = DADOS) {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: dados.name } })
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: dados.email } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: dados.password } })
  fireEvent.change(screen.getByLabelText('Confirmação de senha'), {
    target: { value: dados.passwordConfirmation },
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
})

describe('RegisterPage', () => {
  it('renderiza os quatro campos do cadastro', () => {
    renderizar()

    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmação de senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument()
  })

  it('exibe erros de campos obrigatórios sem chamar a API', () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(screen.getByText('Informe seu nome.')).toBeInTheDocument()
    expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(screen.getByText('Confirme sua senha.')).toBeInTheDocument()
    expect(registerUser).not.toHaveBeenCalled()
  })

  it('valida nome, e-mail e senha', () => {
    renderizar()

    preencher({
      name: 'Ab',
      email: 'email-invalido',
      password: 'curta',
      passwordConfirmation: 'curta',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(screen.getByText('O nome deve ter no mínimo 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByText('A senha deve ter no mínimo 8 caracteres.')).toBeInTheDocument()
    expect(registerUser).not.toHaveBeenCalled()
  })

  it('rejeita divergência entre senha e confirmação', () => {
    renderizar()

    preencher({ ...DADOS, passwordConfirmation: 'OutraSenha123' })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument()
    expect(registerUser).not.toHaveBeenCalled()
  })

  it('envia exatamente os dados do contrato e orienta a verificar o e-mail', async () => {
    registerUser.mockResolvedValue({ userId: 'u1', role: 'PRINCIPAL' })
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() => expect(registerUser).toHaveBeenCalledWith(DADOS))
    expect(await screen.findByRole('status')).toHaveTextContent(SUCESSO)
    expect(screen.queryByText(/reenviar/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/register')
    expect(sessionStorage.getItem('aurora.session')).toBeNull()
  })

  it('mostra carregamento e impede envio duplicado', async () => {
    let resolver
    registerUser.mockImplementation(() => new Promise((resolve) => { resolver = resolve }))
    renderizar()

    preencher()
    const botao = screen.getByRole('button', { name: 'Criar conta' })
    fireEvent.click(botao)

    expect(screen.getByText('Enviando...')).toBeInTheDocument()
    expect(botao).toBeDisabled()
    fireEvent.click(botao)
    expect(registerUser).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolver({ userId: 'u1' })
    })

    expect(await screen.findByRole('status')).toHaveTextContent(SUCESSO)
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled()
  })

  it.each([400, 409, 503])('exibe todas as mensagens da API em %i', async (status) => {
    const mensagens = [`Mensagem ${status} um`, `Mensagem ${status} dois`]
    registerUser.mockRejectedValue(new ApiError({
      status,
      erro: 'Falha na operação',
      messages: mensagens,
      caminho: '/api/auth/register',
    }))
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() => {
      mensagens.forEach((mensagem) => {
        expect(screen.getByText(mensagem)).toBeInTheDocument()
      })
    })
    expect(registerUser).toHaveBeenCalledTimes(1)
  })
})
