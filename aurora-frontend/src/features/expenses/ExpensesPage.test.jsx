import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/errors.js'
import { AuthProvider } from '../../shared/auth/AuthContext.jsx'
import { formatCurrency } from '../../shared/format/currency.js'
import { listMembers } from '../familymanagement/api/listMembers.js'
import { listExpenses } from './api/listExpenses.js'
import { deleteExpense } from './api/deleteExpense.js'
import { updateExpense } from './api/updateExpense.js'
import ExpensesPage from './ExpensesPage.jsx'

vi.mock('./api/listExpenses.js', () => ({ listExpenses: vi.fn() }))
vi.mock('./api/deleteExpense.js', () => ({ deleteExpense: vi.fn() }))
vi.mock('./api/updateExpense.js', () => ({ updateExpense: vi.fn() }))
vi.mock('../familymanagement/api/listMembers.js', () => ({ listMembers: vi.fn() }))

const SESSION_KEY = 'aurora.session'

const DESPESAS = [
  {
    id: 'd1',
    familyGroupId: 'f1',
    userId: 'u1',
    userName: 'Ana Silva',
    userRole: 'PRINCIPAL',
    amount: 100,
    expenseDate: '2026-11-18',
    category: 'TRANSPORTE',
    paymentMethod: 'CARTAO_CREDITO',
    description: 'Corrida de Uber',
    createdAt: '2026-11-18T10:00:00',
    updatedAt: '2026-11-18T10:00:00',
  },
  {
    id: 'd2',
    familyGroupId: 'f1',
    userId: 'u2',
    userName: 'Pedro Silva',
    userRole: 'DEPENDENTE',
    amount: 50,
    expenseDate: '2026-11-17',
    category: 'ALIMENTACAO',
    paymentMethod: 'PIX',
    description: 'Lanche',
    createdAt: '2026-11-17T10:00:00',
    updatedAt: '2026-11-17T10:00:00',
  },
]

const MEMBROS = [
  { id: 'u1', name: 'Ana Silva', role: 'PRINCIPAL' },
  { id: 'u2', name: 'Pedro Silva', role: 'DEPENDENTE' },
]

function iso(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function sessao(role, userId) {
  return JSON.stringify({
    accessToken: 'jwt-de-teste',
    tokenType: 'Bearer',
    expiresIn: 3600,
    expiresAt: Date.now() + 3_600_000,
    userId,
    familyGroupId: 'f1',
    name: role === 'PRINCIPAL' ? 'Ana Silva' : 'Pedro Silva',
    email: 'teste@example.com',
    role,
  })
}

function Localizacao() {
  const location = useLocation()
  return <span data-testid="caminho">{location.pathname}</span>
}

function renderizar(role = 'PRINCIPAL', userId = 'u1') {
  sessionStorage.setItem(SESSION_KEY, sessao(role, userId))
  return render(
    <MemoryRouter initialEntries={['/expenses']}>
      <AuthProvider>
        <Localizacao />
        <ExpensesPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  listExpenses.mockResolvedValue(DESPESAS)
  listMembers.mockResolvedValue(MEMBROS)
  deleteExpense.mockResolvedValue(null)
  updateExpense.mockResolvedValue({
    ...DESPESAS[0],
    amount: 75,
    category: 'ALIMENTACAO',
    description: 'Corrida atualizada',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe('ExpensesPage', () => {
  it('carrega a listagem e exibe os dados do contrato com formatação', async () => {
    renderizar()

    expect(screen.getByText('Carregando despesas...')).toBeInTheDocument()

    await screen.findAllByText('Corrida de Uber')

    const tabela = screen.getByTestId('expenses-tabela')
    expect(within(tabela).getByText('Corrida de Uber')).toBeInTheDocument()
    expect(within(tabela).getByText('R$ 100,00')).toBeInTheDocument()
    expect(within(tabela).getByText('18/11/2026')).toBeInTheDocument()
    expect(within(tabela).getByText('TRANSPORTE')).toBeInTheDocument()
    expect(within(tabela).getByText('Cartão de crédito')).toBeInTheDocument()
    expect(within(tabela).getByText('Ana Silva')).toBeInTheDocument()

    const cards = screen.getByTestId('expenses-cards')
    expect(within(cards).getByText('Corrida de Uber')).toBeInTheDocument()
    expect(within(cards).getByText('Lanche')).toBeInTheDocument()
  })

  it('exibe o estado de lista vazia', async () => {
    listExpenses.mockResolvedValue([])

    renderizar()

    expect(await screen.findByText('Nenhuma despesa registrada no período selecionado.'))
      .toBeInTheDocument()
    expect(screen.queryByTestId('expenses-tabela')).not.toBeInTheDocument()
  })

  it('exibe as mensagens de erro da API', async () => {
    listExpenses.mockRejectedValue(new ApiError({
      status: 500,
      erro: 'Erro interno',
      messages: ['Não foi possível carregar as despesas.'],
    }))

    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as despesas.')
    expect(screen.queryByTestId('expenses-tabela')).not.toBeInTheDocument()
  })

  it('Principal vê título, resumos, filtros, totais e quantidade de registros', async () => {
    renderizar()

    await screen.findAllByText('Corrida de Uber')

    expect(screen.getByRole('heading', { name: 'Cada gasto, uma visão mais clara.' }))
      .toBeInTheDocument()
    expect(screen.getByText('Veja os registros realizados e quem participou de cada despesa.'))
      .toBeInTheDocument()
    expect(screen.getByLabelText('Trilha de navegação')).toHaveTextContent('Gastos da família')

    expect(screen.getByRole('button', { name: 'Esta semana' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Este mês' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeInTheDocument()

    expect(screen.getByLabelText('Membro')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Todos os membros' })).toBeInTheDocument()

    expect(screen.getByText('Gastos realizados por todos os membros')).toBeInTheDocument()
    expect(screen.getByTestId('total-geral')).toHaveTextContent('R$ 150,00')
    expect(screen.getByText('Total: R$ 150,00')).toBeInTheDocument()
    expect(screen.getByText('2 registros')).toBeInTheDocument()
    expect(screen.getAllByText(/\d+%/)).toHaveLength(2)
  })

  it('Dependente não vê filtro por membro, totais, resumos ou percentuais', async () => {
    listExpenses.mockResolvedValue([DESPESAS[1]])

    renderizar('DEPENDENTE', 'u2')

    await screen.findAllByText('Lanche')

    expect(screen.getByRole('heading', { name: 'Cada gasto, uma visão mais clara.' }))
      .toBeInTheDocument()
    expect(screen.queryByLabelText('Membro')).not.toBeInTheDocument()
    expect(screen.queryByText('Gastos realizados por todos os membros')).not.toBeInTheDocument()
    expect(screen.queryByTestId('total-geral')).not.toBeInTheDocument()
    expect(screen.queryByText(/Total:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/registros ·/)).not.toBeInTheDocument()
    expect(screen.getByText('1 registros')).toBeInTheDocument()

    expect(listExpenses).toHaveBeenCalled()
    expect(listExpenses.mock.calls[0][0]).not.toHaveProperty('memberId')
  })

  it('envia períodos completos de calendário e o memberId do filtro de membro', async () => {
    renderizar()

    await screen.findAllByText('Corrida de Uber')

    const hoje = new Date()

    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    expect(listExpenses.mock.calls[0][0]).toMatchObject({
      startDate: iso(primeiroDiaMes),
      endDate: iso(ultimoDiaMes),
    })

    const segunda = new Date(hoje)
    segunda.setDate(segunda.getDate() - ((segunda.getDay() + 6) % 7))
    const domingo = new Date(segunda)
    domingo.setDate(domingo.getDate() + 6)

    fireEvent.click(screen.getByRole('button', { name: 'Esta semana' }))
    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0]).toMatchObject({
        startDate: iso(segunda),
        endDate: iso(domingo),
      })
    })

    const primeiroDiaAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const ultimoDiaAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0)

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0]).toMatchObject({
        startDate: iso(primeiroDiaAnterior),
        endDate: iso(ultimoDiaAnterior),
      })
    })

    fireEvent.change(screen.getByLabelText('Membro'), { target: { value: 'u2' } })
    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0]).toHaveProperty('memberId', 'u2')
    })
  })

  it('oferece acionador local que navega para /expenses/new', async () => {
    renderizar()

    await screen.findAllByText('Corrida de Uber')

    const botao = screen.getByRole('button', { name: 'Registrar despesa' })
    expect(botao).toBeInTheDocument()

    fireEvent.click(botao)

    expect(screen.getByTestId('caminho')).toHaveTextContent('/expenses/new')
  })

  it('mantém os dados do filtro mais recente quando uma resposta antiga chega depois', async () => {
    let resolverNovembro
    let resolverOutubro
    listExpenses
      .mockImplementationOnce(() => new Promise((resolve) => { resolverNovembro = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolverOutubro = resolve }))

    renderizar()

    await waitFor(() => expect(listExpenses).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))

    await waitFor(() => expect(listExpenses).toHaveBeenCalledTimes(2))

    await act(async () => {
      resolverOutubro([{ ...DESPESAS[0], id: 'outubro', description: 'Gasto de outubro' }])
    })
    expect(await screen.findAllByText('Gasto de outubro')).not.toHaveLength(0)

    await act(async () => {
      resolverNovembro([{ ...DESPESAS[1], id: 'novembro', description: 'Gasto de novembro' }])
    })

    expect(screen.queryAllByText('Gasto de outubro')).not.toHaveLength(0)
    expect(screen.queryAllByText('Gasto de novembro')).toHaveLength(0)
  })

  it('impede que resposta obsoleta sobrescreva erro da consulta atual', async () => {
    let resolverAntiga
    listExpenses
      .mockImplementationOnce(() => new Promise((resolve) => { resolverAntiga = resolve }))
      .mockRejectedValueOnce(new ApiError({
        status: 500,
        erro: 'Erro interno',
        messages: ['Erro da consulta selecionada.'],
      }))

    renderizar()

    await waitFor(() => expect(listExpenses).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))

    expect(await screen.findByText('Erro da consulta selecionada.')).toBeInTheDocument()

    await act(async () => {
      resolverAntiga([{ ...DESPESAS[0], id: 'antiga', description: 'Gasto antigo' }])
    })

    expect(screen.getByText('Erro da consulta selecionada.')).toBeInTheDocument()
    expect(screen.queryAllByText('Gasto antigo')).toHaveLength(0)
    expect(screen.queryByText('Carregando despesas...')).not.toBeInTheDocument()
  })
})

describe('ExpensesPage — exclusão de despesas', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Corrida de Uber')
    return {
      tabela: screen.getByTestId('expenses-tabela'),
      cards: screen.getByTestId('expenses-cards'),
    }
  }

  it('oferece a ação Excluir na tabela desktop e nos cards mobile', async () => {
    const { tabela, cards } = await renderizarComDados()

    expect(within(tabela).getAllByRole('button', { name: 'Excluir' })).toHaveLength(2)
    expect(within(cards).getAllByRole('button', { name: 'Excluir' })).toHaveLength(2)
  })

  it('cancelar a confirmação não chama a API', async () => {
    const { tabela } = await renderizarComDados()

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Excluir' })[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(deleteExpense).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirma a exclusão com o ID correto e sem dados de identificação', async () => {
    const { tabela } = await renderizarComDados()

    const linha = within(tabela).getAllByRole('row')[2]
    fireEvent.click(within(linha).getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    await waitFor(() => expect(deleteExpense).toHaveBeenCalledTimes(1))
    expect(deleteExpense).toHaveBeenCalledWith('d2')
    expect(deleteExpense.mock.calls[0]).toHaveLength(1)
  })

  it('remove a despesa, atualiza a quantidade e os totais do Principal', async () => {
    const { tabela } = await renderizarComDados()

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Excluir' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    expect(await screen.findByText('Despesa excluída.')).toBeInTheDocument()
    expect(screen.queryAllByText('Corrida de Uber')).toHaveLength(0)
    expect(screen.getByTestId('total-geral')).toHaveTextContent('R$ 50,00')
    expect(screen.getByText('1 registros')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mantém o registro e permite nova tentativa quando a API falha', async () => {
    deleteExpense.mockRejectedValueOnce(new ApiError({
      status: 403,
      erro: 'Acesso negado',
      messages: ['Você não pode excluir esta despesa.'],
    }))

    const { tabela } = await renderizarComDados()

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Excluir' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    expect(await screen.findByText('Você não pode excluir esta despesa.')).toBeInTheDocument()
    expect(screen.queryAllByText('Corrida de Uber')).not.toHaveLength(0)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    await waitFor(() => expect(deleteExpense).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Despesa excluída.')).toBeInTheDocument()
    expect(screen.queryByText('Você não pode excluir esta despesa.')).not.toBeInTheDocument()
  })

  it('impede solicitações duplicadas para a mesma despesa', async () => {
    let resolver
    deleteExpense.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    const { tabela } = await renderizarComDados()

    const botao = within(tabela).getAllByRole('button', { name: 'Excluir' })[0]
    fireEvent.click(botao)
    const confirmar = screen.getByRole('button', { name: 'Confirmar exclusão' })
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)

    expect(deleteExpense).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Excluindo...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    await act(async () => { resolver(null) })
  })

  it('exclui a partir do card mobile e identifica a despesa correta', async () => {
    const { cards } = await renderizarComDados()

    fireEvent.click(within(cards).getAllByRole('button', { name: 'Excluir' })[1])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText(/Lanche/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    await waitFor(() => expect(deleteExpense).toHaveBeenCalledWith('d2'))
  })

  it('preserva os filtros de período e membro após a exclusão', async () => {
    const { tabela } = await renderizarComDados()

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0].startDate).toMatch(/^\d{4}-\d{2}-01$/)
    })

    fireEvent.change(screen.getByLabelText('Membro'), { target: { value: 'u2' } })
    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0]).toHaveProperty('memberId', 'u2')
    })

    const consultasAntes = listExpenses.mock.calls.length

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Excluir' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    expect(await screen.findByText('Despesa excluída.')).toBeInTheDocument()
    expect(listExpenses).toHaveBeenCalledTimes(consultasAntes)
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Membro')).toHaveValue('u2')
  })
})

describe('ExpensesPage — edição de despesas', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Corrida de Uber')
    return {
      tabela: screen.getByTestId('expenses-tabela'),
      cards: screen.getByTestId('expenses-cards'),
    }
  }

  it('oferece a ação Editar na tabela desktop e nos cards mobile', async () => {
    const { tabela, cards } = await renderizarComDados()

    expect(within(tabela).getAllByRole('button', { name: 'Editar' })).toHaveLength(2)
    expect(within(cards).getAllByRole('button', { name: 'Editar' })).toHaveLength(2)
  })

  it('abre o formulário preenchido com os dados atuais', async () => {
    const { tabela } = await renderizarComDados()

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Editar' })[0])

    const formulario = screen.getByRole('region', { name: 'Editar despesa' })
    expect(within(formulario).getByLabelText('Valor')).toHaveValue(formatCurrency(100))
    expect(within(formulario).getByLabelText('Data da despesa')).toHaveValue('2026-11-18')
    expect(within(formulario).getByLabelText('Categoria')).toHaveValue('TRANSPORTE')
    expect(within(formulario).getByLabelText('Descrição')).toHaveValue('Corrida de Uber')
    expect(within(formulario).getByText('Cartão de crédito')).toBeInTheDocument()
  })

  it('valida os campos obrigatórios e limites', async () => {
    const { tabela } = await renderizarComDados()

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Editar' })[0])
    const formulario = screen.getByRole('region', { name: 'Editar despesa' })

    fireEvent.change(within(formulario).getByLabelText('Valor'), { target: { value: '' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))
    expect(within(formulario).getByText('Informe o valor da despesa.')).toBeInTheDocument()

    fireEvent.change(within(formulario).getByLabelText('Categoria'), { target: { value: '' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))
    expect(within(formulario).getByText('Informe a categoria.')).toBeInTheDocument()

    fireEvent.change(within(formulario).getByLabelText('Descrição'), { target: { value: 'a'.repeat(256) } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))
    expect(within(formulario).getByText('A descrição deve ter no máximo 255 caracteres.')).toBeInTheDocument()
    expect(updateExpense).not.toHaveBeenCalled()
  })

  it('cancelar não chama a API, fecha o formulário e preserva a listagem', async () => {
    const { tabela } = await renderizarComDados()

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Editar' })[0])
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(updateExpense).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Editar despesa' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Corrida de Uber').length).toBeGreaterThan(0)
    expect(screen.getByTestId('total-geral')).toHaveTextContent('R$ 150,00')
  })

  it('salva com o ID correto e payload sem identificadores nem parcelamento', async () => {
    updateExpense.mockResolvedValueOnce({
      ...DESPESAS[1],
      amount: 75,
      category: 'ALIMENTACAO',
    })
    const { tabela } = await renderizarComDados()

    const linha = within(tabela).getAllByRole('row')[2]
    fireEvent.click(within(linha).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar despesa' })
    fireEvent.change(within(formulario).getByLabelText('Valor'), { target: { value: '75,00' } })
    fireEvent.change(within(formulario).getByLabelText('Categoria'), { target: { value: 'ALIMENTACAO' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(updateExpense).toHaveBeenCalledTimes(1))
    expect(updateExpense).toHaveBeenCalledWith('d2', {
      amount: 75,
      expenseDate: '2026-11-17',
      category: 'ALIMENTACAO',
      description: 'Lanche',
    })
    expect(updateExpense.mock.calls[0][1]).not.toHaveProperty('userId')
    expect(updateExpense.mock.calls[0][1]).not.toHaveProperty('familyGroupId')
    expect(updateExpense.mock.calls[0][1]).not.toHaveProperty('installmentCount')
  })

  it('atualiza a listagem, os totais e exibe confirmação após salvar', async () => {
    const { tabela } = await renderizarComDados()

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Editar' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Despesa atualizada.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Editar despesa' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Corrida atualizada').length).toBeGreaterThan(0)
    expect(screen.getByTestId('total-geral')).toHaveTextContent('R$ 125,00')
  })

  it('preserva período e membro selecionados durante a edição', async () => {
    const { tabela } = await renderizarComDados()

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0].startDate).toMatch(/^\d{4}-\d{2}-01$/)
    })
    fireEvent.change(screen.getByLabelText('Membro'), { target: { value: 'u2' } })
    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0]).toHaveProperty('memberId', 'u2')
    })

    const consultasAntes = listExpenses.mock.calls.length

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Editar' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Despesa atualizada.')).toBeInTheDocument()
    expect(listExpenses).toHaveBeenCalledTimes(consultasAntes)
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Membro')).toHaveValue('u2')
  })

  it('mantém o formulário aberto e os dados em caso de erro, permitindo nova tentativa', async () => {
    updateExpense.mockRejectedValueOnce(new ApiError({
      status: 400,
      erro: 'Operação não permitida',
      messages: ['Despesas com faturas fechadas não podem ser alteradas.'],
    }))

    const { tabela } = await renderizarComDados()

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Editar' })[0])
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Descrição digitada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Despesas com faturas fechadas não podem ser alteradas.'))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editar despesa' })).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toHaveValue('Descrição digitada')

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(updateExpense).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Despesa atualizada.')).toBeInTheDocument()
  })

  it('impede envios duplicados enquanto salva', async () => {
    let resolver
    updateExpense.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    const { tabela } = await renderizarComDados()

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Editar' })[0])
    const salvar = screen.getByRole('button', { name: 'Salvar' })
    fireEvent.click(salvar)
    fireEvent.click(salvar)

    expect(updateExpense).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()

    await act(async () => { resolver(DESPESAS[0]) })
  })

  it('mantém a forma de pagamento somente como leitura e abre um formulário por vez', async () => {
    const { tabela, cards } = await renderizarComDados()

    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Editar' })[0])
    const formulario = screen.getByRole('region', { name: 'Editar despesa' })
    expect(within(formulario).queryByRole('combobox')).not.toBeInTheDocument()

    fireEvent.click(within(cards).getAllByRole('button', { name: 'Editar' })[1])

    expect(screen.getAllByRole('region', { name: 'Editar despesa' })).toHaveLength(1)
    expect(within(screen.getByRole('region', { name: 'Editar despesa' }))
      .getByLabelText('Descrição')).toHaveValue('Lanche')
  })
})

describe('ExpensesPage — filtro por categoria', () => {
  async function renderizarComDados(role = 'PRINCIPAL', userId = 'u1') {
    renderizar(role, userId)
    await screen.findAllByText('Corrida de Uber')
  }

  it('oferece campo de categoria acessível no painel de filtros', async () => {
    await renderizarComDados()

    const campo = screen.getByLabelText('Categoria')
    expect(campo).toBeInTheDocument()
    expect(campo).toHaveAttribute('type', 'text')
    expect(campo).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Limpar' })).not.toBeInTheDocument()
  })

  it('envia a categoria informada na consulta', async () => {
    await renderizarComDados()

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'TRANSPORTE' } })

    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0]).toHaveProperty('category', 'TRANSPORTE')
    })
  })

  it('combina categoria, período e membro na mesma consulta', async () => {
    await renderizarComDados()

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0].startDate).toMatch(/^\d{4}-\d{2}-01$/)
    })

    fireEvent.change(screen.getByLabelText('Membro'), { target: { value: 'u2' } })
    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0]).toHaveProperty('memberId', 'u2')
    })

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'Alimentação' } })

    await waitFor(() => {
      const filtro = listExpenses.mock.calls.at(-1)[0]
      expect(filtro).toHaveProperty('category', 'Alimentação')
      expect(filtro).toHaveProperty('memberId', 'u2')
      expect(filtro.startDate).toMatch(/^\d{4}-\d{2}-01$/)
    })
  })

  it('permite limpar o filtro de categoria sem afetar os demais filtros', async () => {
    await renderizarComDados()

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'TRANSPORTE' } })
    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0]).toHaveProperty('category', 'TRANSPORTE')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    await waitFor(() => {
      expect(listExpenses.mock.calls.at(-1)[0]).not.toHaveProperty('category')
    })
    expect(screen.getByLabelText('Categoria')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Este mês' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('exibe estado vazio quando nenhuma despesa corresponde à categoria', async () => {
    await renderizarComDados()
    listExpenses.mockResolvedValue([])

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'INEXISTENTE' } })

    expect(await screen.findByText('Nenhuma despesa registrada no período selecionado.'))
      .toBeInTheDocument()
    expect(screen.queryByTestId('expenses-tabela')).not.toBeInTheDocument()
  })

  it('mantém as regras de perfil ao filtrar por categoria', async () => {
    await renderizarComDados('DEPENDENTE', 'u2')

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'TRANSPORTE' } })

    await waitFor(() => {
      const filtro = listExpenses.mock.calls.at(-1)[0]
      expect(filtro).toHaveProperty('category', 'TRANSPORTE')
      expect(filtro).not.toHaveProperty('memberId')
    })
    expect(screen.queryByTestId('total-geral')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Membro')).not.toBeInTheDocument()
  })

  it('exibe erros da API ao filtrar por categoria', async () => {
    await renderizarComDados()
    listExpenses.mockRejectedValueOnce(new ApiError({
      status: 500,
      erro: 'Erro interno',
      messages: ['Não foi possível filtrar as despesas.'],
    }))

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'TRANSPORTE' } })

    expect(await screen.findByText('Não foi possível filtrar as despesas.')).toBeInTheDocument()
  })

  it('não permite que resposta antiga sobrescreva o resultado da categoria atual', async () => {
    let resolverSemFiltro
    let resolverComFiltro
    listExpenses
      .mockImplementationOnce(() => new Promise((resolve) => { resolverSemFiltro = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolverComFiltro = resolve }))

    renderizar()
    await waitFor(() => expect(listExpenses).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'TRANSPORTE' } })
    await waitFor(() => expect(listExpenses).toHaveBeenCalledTimes(2))

    await act(async () => {
      resolverComFiltro([{ ...DESPESAS[0], id: 'filtrada', description: 'Gasto filtrado' }])
    })
    expect(await screen.findAllByText('Gasto filtrado')).not.toHaveLength(0)

    await act(async () => { resolverSemFiltro(DESPESAS) })

    expect(screen.queryAllByText('Gasto filtrado')).not.toHaveLength(0)
    expect(screen.queryAllByText('Lanche')).toHaveLength(0)
  })
})
