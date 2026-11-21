import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/errors.js'
import { AuthProvider } from '../../shared/auth/AuthContext.jsx'
import { createReceivable } from './api/createReceivable.js'
import RegisterReceivablePage from './RegisterReceivablePage.jsx'

vi.mock('./api/createReceivable.js', () => ({ createReceivable: vi.fn() }))

const SESSION_KEY = 'aurora.session'

const RESPOSTA = {
  id: 'r1',
  recurrenceSeriesId: 's1',
  occurrenceNumber: 1,
  description: 'Salário',
  expectedAmount: 5000,
  expectedDate: '2026-11-05',
  recurrence: 'MENSAL',
  status: 'PENDENTE',
}

function Localizacao() {
  const location = useLocation()
  return <span data-testid="caminho">{location.pathname}</span>
}

function renderizar() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    accessToken: 'jwt-de-teste',
    tokenType: 'Bearer',
    expiresIn: 3600,
    expiresAt: Date.now() + 3_600_000,
    userId: 'u1',
    familyGroupId: 'f1',
    name: 'Ana Silva',
    email: 'ana@example.com',
    role: 'PRINCIPAL',
  }))

  return render(
    <MemoryRouter initialEntries={['/receivables/new']}>
      <AuthProvider>
        <Localizacao />
        <RegisterReceivablePage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function preencher({ description, expectedAmount, expectedDate, recurrence }) {
  if (description !== undefined) {
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: description } })
  }
  if (expectedAmount !== undefined) {
    fireEvent.change(screen.getByLabelText('Valor esperado'), { target: { value: expectedAmount } })
  }
  if (expectedDate !== undefined) {
    fireEvent.change(screen.getByLabelText('Data prevista'), { target: { value: expectedDate } })
  }
  if (recurrence !== undefined) {
    fireEvent.change(screen.getByLabelText('Recorrência'), { target: { value: recurrence } })
  }
}

function preencherValido() {
  preencher({
    description: 'Salário',
    expectedAmount: '5000,00',
    expectedDate: '2026-11-05',
    recurrence: 'MENSAL',
  })
}

function enviar() {
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar recebimento' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  createReceivable.mockResolvedValue(RESPOSTA)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe('RegisterReceivablePage', () => {
  it('exibe os quatro campos do cadastro', () => {
    renderizar()

    expect(screen.getByLabelText('Descrição')).toBeInTheDocument()
    expect(screen.getByLabelText('Valor esperado')).toBeInTheDocument()
    expect(screen.getByLabelText('Data prevista')).toBeInTheDocument()
    expect(screen.getByLabelText('Recorrência')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Mensal' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sem recorrência' })).toBeInTheDocument()
  })

  it('exibe rótulos acessíveis com classe padronizada', () => {
    renderizar()

    expect(screen.getByText('Descrição')).toHaveClass('register-receivable__label')
    expect(screen.getByText('Valor esperado')).toHaveClass('register-receivable__label')
    expect(screen.getByText('Data prevista')).toHaveClass('register-receivable__label')
    expect(screen.getByText('Recorrência')).toHaveClass('register-receivable__label')
  })

  it('valida os campos obrigatórios', () => {
    renderizar()
    enviar()

    expect(screen.getByText('A descrição do recebimento é obrigatória.')).toBeInTheDocument()
    expect(screen.getByText('Informe o valor esperado.')).toBeInTheDocument()
    expect(screen.getByText('A data prevista é obrigatória.')).toBeInTheDocument()
    expect(screen.getByText('A recorrência é obrigatória.')).toBeInTheDocument()
    expect(createReceivable).not.toHaveBeenCalled()
  })

  it('rejeita valor inválido e zero', () => {
    renderizar()

    preencher({ expectedAmount: 'abc' })
    enviar()
    expect(screen.getByText('Informe um valor válido com até duas casas decimais.')).toBeInTheDocument()

    preencher({ expectedAmount: '0' })
    enviar()
    expect(screen.getByText('O valor esperado deve ser maior que zero.')).toBeInTheDocument()
    expect(createReceivable).not.toHaveBeenCalled()
  })

  it('envia o payload exato do DTO sem identificadores', async () => {
    renderizar()
    preencherValido()
    enviar()

    await waitFor(() => expect(createReceivable).toHaveBeenCalledTimes(1))
    expect(createReceivable).toHaveBeenCalledWith({
      description: 'Salário',
      expectedAmount: 5000,
      expectedDate: '2026-11-05',
      recurrence: 'MENSAL',
    })
    expect(createReceivable.mock.calls[0][0]).not.toHaveProperty('userId')
    expect(createReceivable.mock.calls[0][0]).not.toHaveProperty('familyGroupId')
  })

  it('exibe carregamento e bloqueia duplo envio', async () => {
    let resolver
    createReceivable.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    renderizar()
    preencherValido()
    const botao = screen.getByRole('button', { name: 'Cadastrar recebimento' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(createReceivable).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Cadastrando...' })).toBeDisabled()

    await act(async () => { resolver(RESPOSTA) })
  })

  it('exibe confirmação somente após sucesso e retorna à listagem', async () => {
    renderizar()
    preencherValido()
    enviar()

    expect(await screen.findByText('Recebimento cadastrado.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para a listagem' }))
    expect(screen.getByTestId('caminho')).toHaveTextContent('/receivables')
  })

  it('exibe erro da API preservando os dados e permitindo nova tentativa', async () => {
    createReceivable.mockRejectedValueOnce(new ApiError({
      status: 400,
      erro: 'Dados inválidos',
      messages: ['O valor esperado deve ser maior que zero.'],
    }))

    renderizar()
    preencherValido()
    enviar()

    expect(await screen.findByText('O valor esperado deve ser maior que zero.')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toHaveValue('Salário')
    expect(screen.getByLabelText('Data prevista')).toHaveValue('2026-11-05')
    expect(screen.queryByText('Recebimento cadastrado.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar recebimento' }))
    await waitFor(() => expect(createReceivable).toHaveBeenCalledTimes(2))
  })
})
