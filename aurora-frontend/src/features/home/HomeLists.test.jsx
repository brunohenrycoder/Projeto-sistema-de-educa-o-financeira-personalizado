import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../shared/api/errors.js'
import { listPayableBills } from '../payablebills/api/listPayableBills.js'
import { listExpenses } from '../expenses/api/listExpenses.js'
import HomeRecentExpenses from './HomeRecentExpenses.jsx'
import HomeUpcomingBills from './HomeUpcomingBills.jsx'

vi.mock('../payablebills/api/listPayableBills.js', () => ({ listPayableBills: vi.fn() }))
vi.mock('../expenses/api/listExpenses.js', () => ({ listExpenses: vi.fn() }))

const CONTAS = [
  { id: 'c1', description: 'Aluguel', amount: 1500, dueDate: '2026-11-20', status: 'PENDENTE' },
  { id: 'c2', description: 'Energia', amount: 210, dueDate: '2026-11-21', status: 'ATRASADA' },
  { id: 'c3', description: 'Internet', amount: 120, dueDate: '2026-11-22', status: 'PENDENTE' },
  { id: 'c4', description: 'Água', amount: 80, dueDate: '2026-11-23', status: 'PENDENTE' },
  { id: 'c5', description: 'Condomínio', amount: 430, dueDate: '2026-11-24', status: 'ATRASADA' },
  { id: 'c6', description: 'Excedente', amount: 50, dueDate: '2026-11-25', status: 'PENDENTE' },
  { id: 'c7', description: 'Conta paga', amount: 10, dueDate: '2026-11-26', status: 'PAGA' },
  { id: 'c8', description: 'Conta cancelada', amount: 20, dueDate: '2026-11-27', status: 'CANCELADA' },
]

const DESPESAS = [
  { id: 'd1', description: 'Uber', userName: 'Ana Silva', expenseDate: '2026-11-19', amount: 42.5 },
  { id: 'd2', description: 'Mercado', userName: 'Bruno Silva', expenseDate: '2026-11-18', amount: 260 },
  { id: 'd3', description: 'Farmácia', userName: 'Ana Silva', expenseDate: '2026-11-17', amount: 75 },
  { id: 'd4', description: 'Cinema', userName: 'Bruno Silva', expenseDate: '2026-11-16', amount: 90 },
  { id: 'd5', description: 'Padaria', userName: 'Ana Silva', expenseDate: '2026-11-15', amount: 30 },
  { id: 'd6', description: 'Livro', userName: 'Ana Silva', expenseDate: '2026-11-14', amount: 55 },
  { id: 'd7', description: 'Jantar', userName: 'Bruno Silva', expenseDate: '2026-11-13', amount: 120 },
]

function erroApi(mensagem) {
  return new ApiError({
    status: 500,
    erro: 'Erro interno',
    messages: [mensagem],
    caminho: '/api/teste',
  })
}

function renderizarContas() {
  return render(
    <MemoryRouter>
      <HomeUpcomingBills />
    </MemoryRouter>,
  )
}

function renderizarGastos() {
  return render(
    <MemoryRouter>
      <HomeRecentExpenses />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  listPayableBills.mockResolvedValue({ bills: CONTAS })
  listExpenses.mockResolvedValue(DESPESAS)
})

afterEach(() => {
  cleanup()
})

describe('De olho nas contas', () => {
  it('chama o serviço existente ao montar', async () => {
    renderizarContas()

    await waitFor(() => expect(listPayableBills).toHaveBeenCalledTimes(1))
  })

  it('exibe pendentes e atrasadas com os campos disponíveis', async () => {
    renderizarContas()

    await screen.findByText('Aluguel')
    const itens = screen.getAllByRole('listitem')
    expect(within(itens[0]).getByText('Aluguel')).toBeInTheDocument()
    expect(within(itens[1]).getByText('Energia')).toBeInTheDocument()
    expect(within(itens[0]).getByText(/1\.500,00/)).toBeInTheDocument()
    expect(within(itens[0]).getByText('20/11/2026')).toBeInTheDocument()
    expect(within(itens[0]).getByText('Pendente')).toBeInTheDocument()
    expect(within(itens[1]).getByText('Atrasada')).toBeInTheDocument()
  })

  it('não exibe contas pagas ou canceladas', async () => {
    renderizarContas()

    await screen.findByText('Aluguel')
    expect(screen.queryByText('Conta paga')).not.toBeInTheDocument()
    expect(screen.queryByText('Conta cancelada')).not.toBeInTheDocument()
  })

  it('exibe no máximo cinco contas preservando a ordem por vencimento', async () => {
    renderizarContas()

    await screen.findByText('Aluguel')
    const itens = screen.getAllByRole('listitem')
    expect(itens).toHaveLength(5)
    expect(itens[0]).toHaveTextContent('Aluguel')
    expect(itens[1]).toHaveTextContent('Energia')
    expect(itens[2]).toHaveTextContent('Internet')
    expect(itens[3]).toHaveTextContent('Água')
    expect(itens[4]).toHaveTextContent('Condomínio')
    expect(screen.queryByText('Excedente')).not.toBeInTheDocument()
  })

  it('oferece link para a página completa de contas', () => {
    renderizarContas()

    expect(screen.getByRole('link', { name: 'Ver todas as contas' })).toHaveAttribute('href', '/payable-bills')
  })

  it('exibe estado vazio próprio', async () => {
    listPayableBills.mockResolvedValue({ bills: [{ id: 'p1', description: 'Paga', amount: 1, dueDate: '2026-11-20', status: 'PAGA' }] })
    renderizarContas()

    expect(await screen.findByText('Nenhuma conta pendente encontrada.')).toBeInTheDocument()
    expect(screen.queryByText('Carregando gastos...')).not.toBeInTheDocument()
  })

  it('exibe erro e permite retry', async () => {
    listPayableBills
      .mockRejectedValueOnce(erroApi('Não foi possível carregar as contas.'))
      .mockResolvedValueOnce({ bills: CONTAS })
    renderizarContas()

    expect(await screen.findByText('Não foi possível carregar as contas.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Aluguel')).toBeInTheDocument()
    expect(listPayableBills).toHaveBeenCalledTimes(2)
  })
})

describe('Últimos gastos da família', () => {
  it('chama o serviço sem filtros ao montar', async () => {
    renderizarGastos()

    await waitFor(() => expect(listExpenses).toHaveBeenCalledWith())
  })

  it('exibe no máximo cinco despesas preservando a ordem da API', async () => {
    renderizarGastos()

    await screen.findByText('Uber')
    const itens = screen.getAllByRole('listitem')
    expect(itens).toHaveLength(5)
    expect(itens[0]).toHaveTextContent('Uber')
    expect(itens[1]).toHaveTextContent('Mercado')
    expect(itens[2]).toHaveTextContent('Farmácia')
    expect(itens[3]).toHaveTextContent('Cinema')
    expect(itens[4]).toHaveTextContent('Padaria')
    expect(screen.queryByText('Livro')).not.toBeInTheDocument()
  })

  it('exibe descrição, responsável, data e valor', async () => {
    renderizarGastos()

    await screen.findByText('Uber')
    const itens = screen.getAllByRole('listitem')
    expect(within(itens[0]).getByText('Uber')).toBeInTheDocument()
    expect(within(itens[0]).getByText('Ana Silva')).toBeInTheDocument()
    expect(within(itens[0]).getByText('19/11/2026')).toBeInTheDocument()
    expect(within(itens[0]).getByText(/42,50/)).toBeInTheDocument()
  })

  it('oferece link para a página completa de gastos', () => {
    renderizarGastos()

    expect(screen.getByRole('link', { name: 'Ver todos os gastos' })).toHaveAttribute('href', '/expenses')
  })

  it('não exibe totais, médias ou agregações', async () => {
    renderizarGastos()

    await screen.findByText('Uber')
    expect(screen.queryByText(/total|média|saldo/i)).not.toBeInTheDocument()
  })

  it('exibe estado vazio próprio', async () => {
    listExpenses.mockResolvedValue([])
    renderizarGastos()

    expect(await screen.findByText('Nenhum gasto registrado.')).toBeInTheDocument()
  })

  it('exibe erro e permite retry', async () => {
    listExpenses
      .mockRejectedValueOnce(erroApi('Não foi possível carregar os gastos.'))
      .mockResolvedValueOnce(DESPESAS)
    renderizarGastos()

    expect(await screen.findByText('Não foi possível carregar os gastos.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Uber')).toBeInTheDocument()
    expect(listExpenses).toHaveBeenCalledTimes(2)
  })
})

describe('Independência entre os blocos', () => {
  it('falha nas contas não impede a exibição dos gastos', async () => {
    listPayableBills.mockRejectedValue(erroApi('Falha nas contas.'))
    render(
      <MemoryRouter>
        <HomeUpcomingBills />
        <HomeRecentExpenses />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Falha nas contas.')).toBeInTheDocument()
    expect(await screen.findByText('Uber')).toBeInTheDocument()
    expect(screen.queryByText('Carregando contas...')).not.toBeInTheDocument()
  })

  it('falha nos gastos não impede a exibição das contas', async () => {
    listExpenses.mockRejectedValue(erroApi('Falha nos gastos.'))
    render(
      <MemoryRouter>
        <HomeUpcomingBills />
        <HomeRecentExpenses />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Falha nos gastos.')).toBeInTheDocument()
    expect(await screen.findByText('Aluguel')).toBeInTheDocument()
    expect(screen.queryByText('Carregando gastos...')).not.toBeInTheDocument()
  })
})
