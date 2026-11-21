import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/errors.js'
import { AuthProvider } from '../../shared/auth/AuthContext.jsx'
import { formatCurrency } from '../../shared/format/currency.js'
import { registerExpense } from './api/registerExpense.js'
import RegisterExpensePage from './RegisterExpensePage.jsx'

vi.mock('./api/registerExpense.js', () => ({ registerExpense: vi.fn() }))

const DESPESA_CRIADA = {
  id: 'e1',
  familyGroupId: 'f1',
  userId: 'u1',
  userName: 'Ana Silva',
  userRole: 'PRINCIPAL',
  amount: 42.5,
  expenseDate: '2026-11-19',
  category: 'TRANSPORTE',
  paymentMethod: 'CARTAO_CREDITO',
  description: 'Corrida',
  createdAt: '2026-11-19T10:00:00',
  updatedAt: '2026-11-19T10:00:00',
}

function Localizacao() {
  const location = useLocation()
  return <span data-testid="caminho">{location.pathname}</span>
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/expenses/new']}>
      <AuthProvider>
        <Localizacao />
        <RegisterExpensePage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function preencher({ amount, expenseDate, category, paymentMethod, description, installmentCount }) {
  if (amount !== undefined) {
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: amount } })
  }
  if (expenseDate !== undefined) {
    fireEvent.change(screen.getByLabelText('Data da despesa'), { target: { value: expenseDate } })
  }
  if (category !== undefined) {
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: category } })
  }
  if (paymentMethod !== undefined) {
    fireEvent.change(screen.getByLabelText('Forma de pagamento'), { target: { value: paymentMethod } })
  }
  if (description !== undefined) {
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: description } })
  }
  if (installmentCount !== undefined) {
    fireEvent.change(screen.getByLabelText('Parcelas'), { target: { value: installmentCount } })
  }
}

function preencherValido(paymentMethod = 'PIX') {
  preencher({
    amount: '42,50',
    expenseDate: '2026-11-19',
    category: 'TRANSPORTE',
    paymentMethod,
    description: 'Corrida',
  })
}

function enviar() {
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar despesa' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  registerExpense.mockResolvedValue(DESPESA_CRIADA)
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe('RegisterExpensePage — validações locais', () => {
  it('exige valor, data, categoria e forma de pagamento', () => {
    renderizar()
    enviar()

    expect(screen.getByText('Informe o valor da despesa.')).toBeInTheDocument()
    expect(screen.getByText('Informe a data da despesa.')).toBeInTheDocument()
    expect(screen.getByText('Informe a categoria.')).toBeInTheDocument()
    expect(screen.getByText('Informe a forma de pagamento.')).toBeInTheDocument()
    expect(registerExpense).not.toHaveBeenCalled()
    expect(screen.queryByText('Despesa registrada.')).not.toBeInTheDocument()
  })

  it('rejeita valor inválido, zero, negativo e com mais de duas casas decimais', () => {
    renderizar()

    preencher({ amount: 'abc' })
    enviar()
    expect(screen.getByText('Informe um valor válido com até duas casas decimais.')).toBeInTheDocument()

    preencher({ amount: '0' })
    enviar()
    expect(screen.getByText('O valor da despesa deve ser maior que zero.')).toBeInTheDocument()

    preencher({ amount: '-5' })
    enviar()
    expect(screen.getByText('O valor da despesa deve ser maior que zero.')).toBeInTheDocument()

    preencher({ amount: '1,234' })
    enviar()
    expect(screen.getByText('Informe um valor válido com até duas casas decimais.')).toBeInTheDocument()
    expect(registerExpense).not.toHaveBeenCalled()
  })

  it('aceita valor em pt-BR e aplica formatação monetária ao sair do campo', () => {
    renderizar()

    const valor = screen.getByLabelText('Valor')
    fireEvent.change(valor, { target: { value: '42,50' } })
    fireEvent.blur(valor)

    expect(valor).toHaveValue(formatCurrency(42.5))
  })

  it('valida categoria, descrição e parcelamento', () => {
    renderizar()

    preencher({ category: 'a'.repeat(51) })
    enviar()
    expect(screen.getByText('A categoria deve ter no máximo 50 caracteres.')).toBeInTheDocument()

    preencher({ description: 'a'.repeat(256) })
    enviar()
    expect(screen.getByText('A descrição deve ter no máximo 255 caracteres.')).toBeInTheDocument()

    preencher({ paymentMethod: 'CARTAO_CREDITO', installmentCount: '37' })
    enviar()
    expect(screen.getByText('A compra deve ter de 1 a 36 parcelas.')).toBeInTheDocument()
    expect(registerExpense).not.toHaveBeenCalled()
  })

  it('exibe o parcelamento somente para cartão de crédito', () => {
    renderizar()

    expect(screen.queryByLabelText('Parcelas')).not.toBeInTheDocument()

    preencher({ paymentMethod: 'CARTAO_CREDITO' })
    expect(screen.getByLabelText('Parcelas')).toBeInTheDocument()

    preencher({ paymentMethod: 'PIX' })
    expect(screen.queryByLabelText('Parcelas')).not.toBeInTheDocument()
  })
})

describe('RegisterExpensePage — integração com a API', () => {
  it('envia o payload do contrato, sem userId ou dados administrativos', async () => {
    renderizar()

    preencherValido('PIX')
    enviar()

    await waitFor(() => expect(registerExpense).toHaveBeenCalledTimes(1))

    const payload = registerExpense.mock.calls[0][0]
    expect(payload).toEqual({
      amount: 42.5,
      expenseDate: '2026-11-19',
      category: 'TRANSPORTE',
      paymentMethod: 'PIX',
      description: 'Corrida',
    })
    expect(payload).not.toHaveProperty('userId')
    expect(payload).not.toHaveProperty('familyGroupId')
    expect(payload).not.toHaveProperty('cardId')
    expect(payload).not.toHaveProperty('invoiceId')
    expect(payload).not.toHaveProperty('installmentCount')
  })

  it('envia installmentCount somente para cartão de crédito', async () => {
    renderizar()

    preencherValido('CARTAO_CREDITO')
    preencher({ installmentCount: '3' })
    enviar()

    await waitFor(() => expect(registerExpense).toHaveBeenCalledTimes(1))
    expect(registerExpense.mock.calls[0][0]).toMatchObject({
      paymentMethod: 'CARTAO_CREDITO',
      installmentCount: 3,
    })
  })

  it('exibe carregamento e bloqueia o duplo envio', async () => {
    let resolver
    registerExpense.mockImplementation(() => new Promise((resolve) => { resolver = resolve }))
    renderizar()

    preencherValido()
    const botao = screen.getByRole('button', { name: 'Cadastrar despesa' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(registerExpense).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Cadastrando...' })).toBeDisabled()

    await act(async () => { resolver(DESPESA_CRIADA) })
  })

  it('exibe confirmação simples e ação para voltar à listagem após sucesso', async () => {
    renderizar()

    preencherValido()
    enviar()

    expect(await screen.findByText('Despesa registrada.')).toBeInTheDocument()
    expect(screen.queryByText(/total/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/saldo/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para a listagem' }))
    expect(screen.getByTestId('caminho')).toHaveTextContent('/expenses')
  })

  it('exibe erros da API, preserva os campos e permite nova tentativa', async () => {
    registerExpense.mockRejectedValueOnce(new ApiError({
      status: 503,
      erro: 'Serviço indisponível',
      messages: ['Não foi possível associar a despesa a um cartão ativo.'],
    }))
    renderizar()

    preencherValido('CARTAO_CREDITO')
    preencher({ installmentCount: '2' })
    enviar()

    expect(await screen.findByText('Não foi possível associar a despesa a um cartão ativo.'))
      .toBeInTheDocument()
    expect(screen.queryByText('Despesa registrada.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Valor')).toHaveValue('42,50')
    expect(screen.getByLabelText('Categoria')).toHaveValue('TRANSPORTE')
    expect(screen.getByRole('button', { name: 'Cadastrar despesa' })).toBeEnabled()

    enviar()
    await waitFor(() => expect(registerExpense).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Despesa registrada.')).toBeInTheDocument()
  })
})
