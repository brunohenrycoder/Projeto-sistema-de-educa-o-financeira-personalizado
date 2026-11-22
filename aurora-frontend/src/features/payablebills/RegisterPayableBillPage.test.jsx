import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/errors.js'
import { AuthProvider } from '../../shared/auth/AuthContext.jsx'
import { createPayableBill } from './api/createPayableBill.js'
import RegisterPayableBillPage from './RegisterPayableBillPage.jsx'

vi.mock('./api/createPayableBill.js', () => ({ createPayableBill: vi.fn() }))

const SESSION_KEY = 'aurora.session'

const RESPOSTA = {
  id: 'b1',
  recurrenceSeriesId: 's1',
  occurrenceNumber: 1,
  description: 'Aluguel',
  amount: 1500,
  dueDate: '2026-11-20',
  category: 'MORADIA',
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
    <MemoryRouter initialEntries={['/payable-bills/new']}>
      <AuthProvider>
        <Localizacao />
        <RegisterPayableBillPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function preencher({ description, amount, dueDate, category, recurrence }) {
  if (description !== undefined) {
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: description } })
  }
  if (amount !== undefined) {
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: amount } })
  }
  if (dueDate !== undefined) {
    fireEvent.change(screen.getByLabelText('Data de vencimento'), { target: { value: dueDate } })
  }
  if (category !== undefined) {
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: category } })
  }
  if (recurrence !== undefined) {
    fireEvent.change(screen.getByLabelText('Recorrência'), { target: { value: recurrence } })
  }
}

function preencherValido() {
  preencher({
    description: 'Aluguel',
    amount: '1500,00',
    dueDate: '2026-11-20',
    category: 'MORADIA',
    recurrence: 'MENSAL',
  })
}

function enviar() {
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar conta' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  createPayableBill.mockResolvedValue(RESPOSTA)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe('RegisterPayableBillPage', () => {
  it('exibe o formulário com os cinco campos obrigatórios', () => {
    renderizar()

    expect(screen.getByLabelText('Descrição')).toBeInTheDocument()
    expect(screen.getByLabelText('Valor')).toBeInTheDocument()
    expect(screen.getByLabelText('Data de vencimento')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoria')).toBeInTheDocument()
    expect(screen.getByLabelText('Recorrência')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cadastrar conta' })).toBeInTheDocument()
  })

  it('oferece as opções de categoria e recorrência do backend', () => {
    renderizar()

    expect(screen.getByRole('option', { name: 'MORADIA' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'OUTROS' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Mensal' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sem recorrência' })).toBeInTheDocument()
  })

  it('valida os campos obrigatórios', () => {
    renderizar()
    enviar()

    expect(screen.getByText('A descrição da conta é obrigatória.')).toBeInTheDocument()
    expect(screen.getByText('Informe o valor da conta.')).toBeInTheDocument()
    expect(screen.getByText('A data de vencimento é obrigatória.')).toBeInTheDocument()
    expect(screen.getByText('A categoria é obrigatória.')).toBeInTheDocument()
    expect(screen.getByText('A recorrência é obrigatória.')).toBeInTheDocument()
    expect(createPayableBill).not.toHaveBeenCalled()
  })

  it('rejeita valor inválido e zero', () => {
    renderizar()

    preencher({ amount: 'abc' })
    enviar()
    expect(screen.getByText('Informe um valor válido com até duas casas decimais.')).toBeInTheDocument()

    preencher({ amount: '0' })
    enviar()
    expect(screen.getByText('O valor da conta deve ser maior que zero.')).toBeInTheDocument()
    expect(createPayableBill).not.toHaveBeenCalled()
  })

  it('envia o payload exato do DTO sem campos de identificação', async () => {
    renderizar()
    preencherValido()
    enviar()

    await waitFor(() => expect(createPayableBill).toHaveBeenCalledTimes(1))
    expect(createPayableBill).toHaveBeenCalledWith({
      description: 'Aluguel',
      amount: 1500,
      dueDate: '2026-11-20',
      category: 'MORADIA',
      recurrence: 'MENSAL',
    })
    expect(createPayableBill.mock.calls[0][0]).not.toHaveProperty('userId')
    expect(createPayableBill.mock.calls[0][0]).not.toHaveProperty('familyGroupId')
  })

  it('exibe carregamento e bloqueia duplo envio', async () => {
    let resolver
    createPayableBill.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    renderizar()
    preencherValido()
    const botao = screen.getByRole('button', { name: 'Cadastrar conta' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(createPayableBill).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Cadastrando...' })).toBeDisabled()

    await act(async () => { resolver(RESPOSTA) })
  })

  it('exibe confirmação somente após sucesso e permite voltar à listagem', async () => {
    renderizar()
    preencherValido()
    enviar()

    expect(await screen.findByText('Conta a pagar cadastrada.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para a listagem' }))
    expect(screen.getByTestId('caminho')).toHaveTextContent('/payable-bills')
  })

  it('mantém os dados e exibe mensagens da API em caso de erro', async () => {
    createPayableBill.mockRejectedValueOnce(new ApiError({
      status: 400,
      erro: 'Dados inválidos',
      messages: ['O valor da conta deve ser maior que zero.'],
    }))

    renderizar()
    preencherValido()
    enviar()

    expect(await screen.findByText('O valor da conta deve ser maior que zero.')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toHaveValue('Aluguel')
    expect(screen.getByLabelText('Valor')).toHaveValue('1500,00')
    expect(screen.getByLabelText('Data de vencimento')).toHaveValue('2026-11-20')
    expect(screen.queryByText('Conta a pagar cadastrada.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar conta' }))
    await waitFor(() => expect(createPayableBill).toHaveBeenCalledTimes(2))
  })
})
