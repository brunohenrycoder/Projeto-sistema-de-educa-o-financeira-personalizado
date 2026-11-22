import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'

vi.mock('./api/acceptInvite.js', () => ({ acceptInvite: vi.fn() }))

import { ApiError } from '../../shared/api/errors.js'
import { acceptInvite } from './api/acceptInvite.js'
import AcceptInvitePage from './AcceptInvitePage.jsx'

const TOKEN = 'token-bruto-de-teste'
const SUCESSO =
  'Convite aceito. Sua conta foi criada e já pode ser acessada com o e-mail e a senha cadastrados.'

function definirHash(hash = '') {
  window.history.replaceState(null, '', `/family-invite${hash}`)
}

function Localizacao() {
  const location = useLocation()
  return <span data-testid="caminho">{location.pathname}</span>
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/family-invite']}>
      <Localizacao />
      <AcceptInvitePage />
    </MemoryRouter>,
  )
}

function preencher({ email = 'filho@example.com', name = 'Pedro Silva', password = 'SenhaSegura123', passwordConfirmation = 'SenhaSegura123' } = {}) {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirmação de senha'), {
    target: { value: passwordConfirmation },
  })
}

function erroApi(status, mensagens) {
  return new ApiError({
    status,
    erro: 'Convite inválido',
    messages: mensagens,
    caminho: '/api/familymanagement/accept-invite',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  definirHash(`#token=${TOKEN}`)
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  sessionStorage.clear()
  definirHash('')
})

describe('AcceptInvitePage', () => {
  it('exibe o formulário quando o token está presente', () => {
    renderizar()

    expect(screen.getByRole('heading', { name: 'Aceite seu convite.' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmação de senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aceitar convite' })).toBeInTheDocument()
  })

  it('não expõe o token em campo editável nem na URL da requisição', () => {
    renderizar()

    expect(screen.queryByDisplayValue(TOKEN)).not.toBeInTheDocument()
    expect(window.location.hash).toContain(TOKEN)
  })

  it('trata token ausente sem exibir o formulário nem chamar o serviço', () => {
    definirHash('')

    renderizar()

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível abrir o convite.')
    expect(screen.queryByRole('button', { name: 'Aceitar convite' })).not.toBeInTheDocument()
    expect(acceptInvite).not.toHaveBeenCalled()
  })

  it('trata token malformado (fragmento sem valor) como ausente', () => {
    definirHash('#token=')

    renderizar()

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível abrir o convite.')
    expect(acceptInvite).not.toHaveBeenCalled()
  })

  it('exige todos os campos sem chamar o serviço', async () => {
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))

    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe seu nome.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(screen.getByText('Confirme sua senha.')).toBeInTheDocument()
    expect(acceptInvite).not.toHaveBeenCalled()
  })

  it('valida o formato do e-mail', async () => {
    renderizar()

    preencher({ email: 'invalido' })
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(acceptInvite).not.toHaveBeenCalled()
  })

  it('valida a senha mínima de 8 caracteres', async () => {
    renderizar()

    preencher({ password: 'curta', passwordConfirmation: 'curta' })
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))

    expect(await screen.findByText('A senha deve ter no mínimo 8 caracteres.')).toBeInTheDocument()
    expect(acceptInvite).not.toHaveBeenCalled()
  })

  it('rejeita senhas divergentes', async () => {
    renderizar()

    preencher({ passwordConfirmation: 'OutraSenha123' })
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))

    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument()
    expect(acceptInvite).not.toHaveBeenCalled()
  })

  it('envia o payload correto com o token do fragmento e exibe feedback de sucesso', async () => {
    acceptInvite.mockResolvedValue({
      userId: 'u1',
      familyGroupId: 'f1',
      name: 'Pedro Silva',
      email: 'filho@example.com',
      role: 'DEPENDENTE',
      status: 'ATIVO',
      emailConfirmed: true,
      createdAt: '2026-11-18T10:30:00',
    })

    renderizar()
    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))

    await waitFor(() =>
      expect(acceptInvite).toHaveBeenCalledWith({
        token: TOKEN,
        email: 'filho@example.com',
        name: 'Pedro Silva',
        password: 'SenhaSegura123',
        passwordConfirmation: 'SenhaSegura123',
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(SUCESSO)
    expect(window.location.hash).toBe('')
    expect(sessionStorage.getItem('aurora.session')).toBeNull()
  })

  it('oferece navegação para o login após o sucesso sem criar sessão', async () => {
    acceptInvite.mockResolvedValue({ userId: 'u1' })

    renderizar()
    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))
    await screen.findByRole('status')

    fireEvent.click(screen.getByRole('button', { name: 'Ir para o login' }))

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
    expect(sessionStorage.getItem('aurora.session')).toBeNull()
  })

  it('exibe a mensagem do backend para convite expirado', async () => {
    acceptInvite.mockRejectedValue(erroApi(400, ['O convite expirou e não pode mais ser utilizado.']))
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O convite expirou e não pode mais ser utilizado.',
    )
  })

  it('exibe a mensagem do backend para convite já utilizado', async () => {
    acceptInvite.mockRejectedValue(erroApi(400, ['O convite não está mais disponível para uso.']))
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O convite não está mais disponível para uso.',
    )
  })

  it('exibe a mensagem do backend para e-mail divergente', async () => {
    acceptInvite.mockRejectedValue(erroApi(400, ['O e-mail informado não corresponde ao convite.']))
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O e-mail informado não corresponde ao convite.',
    )
  })

  it('exibe demais mensagens da API', async () => {
    acceptInvite.mockRejectedValue(erroApi(400, ['O convite informado é inválido ou não existe.']))
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O convite informado é inválido ou não existe.',
    )
  })

  it('desabilita o botão e previne envio duplicado durante o carregamento', async () => {
    let resolver
    acceptInvite.mockImplementation(() => new Promise((resolve) => { resolver = resolve }))
    renderizar()

    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))
    await waitFor(() => expect(acceptInvite).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Enviando...' }))

    expect(acceptInvite).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled()

    resolver({ userId: 'u1' })
    expect(await screen.findByRole('status')).toHaveTextContent(SUCESSO)
  })
})
