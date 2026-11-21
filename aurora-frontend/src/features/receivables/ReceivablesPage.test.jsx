import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/errors.js'
import { AuthProvider } from '../../shared/auth/AuthContext.jsx'
import { formatCurrency } from '../../shared/format/currency.js'
import { listReceivables } from './api/listReceivables.js'
import { confirmReceivable } from './api/confirmReceivable.js'
import { updateReceivable } from './api/updateReceivable.js'
import { updateReceivableRecurrence } from './api/updateReceivableRecurrence.js'
import { cancelReceivable } from './api/cancelReceivable.js'
import { getReceivableHistory } from './api/getReceivableHistory.js'
import { registerExpense } from '../expenses/api/registerExpense.js'
import ReceivablesPage from './ReceivablesPage.jsx'

vi.mock('./api/listReceivables.js', () => ({ listReceivables: vi.fn() }))
vi.mock('./api/confirmReceivable.js', () => ({ confirmReceivable: vi.fn() }))
vi.mock('./api/updateReceivable.js', () => ({ updateReceivable: vi.fn() }))
vi.mock('./api/updateReceivableRecurrence.js', () => ({ updateReceivableRecurrence: vi.fn() }))
vi.mock('./api/cancelReceivable.js', () => ({ cancelReceivable: vi.fn() }))
vi.mock('./api/getReceivableHistory.js', () => ({ getReceivableHistory: vi.fn() }))
vi.mock('../expenses/api/registerExpense.js', () => ({ registerExpense: vi.fn() }))

const SESSION_KEY = 'aurora.session'

const RECEBIMENTOS = [
  {
    id: 'r1', recurrenceSeriesId: 's1', occurrenceNumber: 1,
    description: 'Salário', expectedAmount: 5000, expectedDate: '2026-11-05',
    receivedDate: null, recurrence: 'MENSAL', status: 'PENDENTE',
  },
  {
    id: 'r2', recurrenceSeriesId: 's2', occurrenceNumber: 2,
    description: 'Aluguel recebido', expectedAmount: 1500, expectedDate: '2026-11-01',
    receivedDate: '2026-11-01', recurrence: 'MENSAL', status: 'ATRASADA',
  },
  {
    id: 'r3', recurrenceSeriesId: 's3', occurrenceNumber: 1,
    description: 'Freelance', expectedAmount: 800, expectedDate: '2026-10-20',
    receivedDate: '2026-10-20', recurrence: 'SEM_RECORRENCIA', status: 'RECEBIDA',
  },
  {
    id: 'r4', recurrenceSeriesId: 's4', occurrenceNumber: 1,
    description: 'Dividendo cancelado', expectedAmount: 100, expectedDate: '2026-10-10',
    receivedDate: null, recurrence: 'SEM_RECORRENCIA', status: 'CANCELADA',
  },
]

function Localizacao() {
  const location = useLocation()
  return <span data-testid="caminho">{location.pathname}</span>
}

function expandirHistorico() {
  const toggle = screen.getByTestId('receivables-historico-toggle')
  if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle)
}

function recolherHistorico() {
  const toggle = screen.getByTestId('receivables-historico-toggle')
  if (toggle.getAttribute('aria-expanded') === 'true') fireEvent.click(toggle)
}

function trocarVisualizacao(rotulo) {
  expandirHistorico()
  fireEvent.click(screen.getByRole('button', { name: rotulo }))
}

function tabelaHistorico() {
  return screen.getByTestId('receivables-tabela-historico')
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
    <MemoryRouter initialEntries={['/receivables']}>
      <AuthProvider>
        <Localizacao />
        <ReceivablesPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  listReceivables.mockResolvedValue({ receivables: RECEBIMENTOS })
  confirmReceivable.mockResolvedValue({
    confirmationId: 'c1',
    receivableId: 'r1',
    amount: 5000,
    expectedDate: '2026-11-05',
    receivedDate: '2026-11-05',
    status: 'RECEBIDA',
    nextOccurrenceId: 'r5',
  })
  updateReceivable.mockResolvedValue({
    id: 'r1',
    description: 'Salário revisado',
    expectedAmount: 5200,
    expectedDate: '2026-11-06',
    recurrence: 'MENSAL',
    status: 'PENDENTE',
  })
  updateReceivableRecurrence.mockResolvedValue({
    recurrenceSeriesId: 's1',
    recurrence: 'MENSAL',
    nextExpectedDate: '2026-12-05',
    updatedOccurrences: 2,
  })
  cancelReceivable.mockResolvedValue({
    cancelledReceivableIds: ['r1'],
    recurrenceActive: true,
  })
  getReceivableHistory.mockResolvedValue({
    receivableId: 'r1',
    history: [{
      id: 'h1',
      changedBy: 'Ana Silva',
      changedAt: '2026-11-05T10:00:00',
      previousStatus: 'PENDENTE',
      status: 'RECEBIDA',
      previousDescription: 'Salário',
      description: 'Salário',
      previousExpectedAmount: 5000,
      expectedAmount: 5000,
      previousExpectedDate: '2026-11-05',
      expectedDate: '2026-11-05',
    }],
    confirmation: {
      amount: 5000,
      expectedDate: '2026-11-05',
      receivedDate: '2026-11-05',
      receivedBy: 'Ana Silva',
    },
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe('ReceivablesPage', () => {
  it('exibe carregamento e chama o serviço de listagem', async () => {
    renderizar()

    expect(screen.getByText('Carregando contas a receber...')).toBeInTheDocument()
    expect(await screen.findAllByText('Salário')).not.toHaveLength(0)
    expect(listReceivables).toHaveBeenCalledTimes(1)
  })

  it('exibe os dados retornados na tabela e nos cards', async () => {
    renderizar()

    await screen.findAllByText('Salário')

    const tabela = screen.getByTestId('receivables-tabela')
    expect(within(tabela).getByText('Salário')).toBeInTheDocument()
    expect(within(tabela).getByText((_, el) => el.tagName === 'TD' && el.textContent === formatCurrency(5000)))
      .toBeInTheDocument()
    expect(within(tabela).getByText('05/11/2026')).toBeInTheDocument()
    expect(within(tabela).getAllByText('Mensal').length).toBeGreaterThan(0)
    expect(within(tabela).getAllByText('1').length).toBeGreaterThan(0)

    const cards = screen.getByTestId('receivables-cards')
    expect(within(cards).getByText('Aluguel recebido')).toBeInTheDocument()
    expect(within(cards).getAllByText(
      (_, el) => el.tagName === 'P' && el.textContent === formatCurrency(1500),
    ).length).toBeGreaterThan(0)
  })

  it('apresenta os status com rótulos legíveis em cada visualização', async () => {
    renderizar()

    await screen.findAllByText('Salário')

    expect(screen.getByTestId('receivables-historico-toggle'))
      .toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Atrasada').length).toBeGreaterThan(0)
    expect(screen.queryByText('Recebida')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancelada')).not.toBeInTheDocument()

    trocarVisualizacao('Recebidas')
    expect(within(tabelaHistorico()).getAllByText('Recebida').length).toBeGreaterThan(0)

    trocarVisualizacao('Canceladas')
    expect(within(tabelaHistorico()).getAllByText('Cancelada').length).toBeGreaterThan(0)
  })

  it('destaca recebimentos atrasados', async () => {
    renderizar()

    await screen.findAllByText('Aluguel recebido')

    expect(screen.getByText('1 recebimento atrasado')).toBeInTheDocument()
    const tabela = screen.getByTestId('receivables-tabela')
    expect(within(tabela).getAllByText('Atrasada').length).toBeGreaterThan(0)
  })

  it('exibe estado vazio quando não há recebimentos', async () => {
    listReceivables.mockResolvedValue({ receivables: [] })

    renderizar()

    expect(await screen.findByText('Nenhum recebimento encontrado.')).toBeInTheDocument()
    expect(screen.queryByTestId('receivables-tabela')).not.toBeInTheDocument()
  })

  it('exibe erro da API e permite tentar novamente', async () => {
    listReceivables.mockRejectedValueOnce(new ApiError({
      status: 500,
      erro: 'Erro interno',
      messages: ['Não foi possível carregar os recebimentos.'],
    }))

    renderizar()

    expect(await screen.findByText('Não foi possível carregar os recebimentos.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => expect(listReceivables).toHaveBeenCalledTimes(2))
    expect(await screen.findAllByText('Salário')).not.toHaveLength(0)
  })

  it('não aplica resposta recebida após a desmontagem da página', async () => {
    let resolver
    listReceivables.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    const { unmount } = renderizar()
    await waitFor(() => expect(listReceivables).toHaveBeenCalledTimes(1))

    unmount()
    await act(async () => { resolver({ receivables: RECEBIMENTOS }) })

    expect(screen.queryByTestId('receivables-tabela')).not.toBeInTheDocument()
    expect(screen.queryAllByText('Salário')).toHaveLength(0)
  })

  it('oferece ação local que navega para o cadastro', async () => {
    renderizar()
    await screen.findAllByText('Salário')

    const botao = screen.getByRole('button', { name: 'Cadastrar recebimento' })
    expect(botao).toBeInTheDocument()

    fireEvent.click(botao)
    expect(screen.getByTestId('caminho')).toHaveTextContent('/receivables/new')
  })
})

describe('ReceivablesPage — confirmação de recebimento', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Salário')
  }

  function acoesDaLinha(index) {
    const tabela = screen.getByTestId('receivables-tabela')
    return within(within(tabela).getAllByRole('row')[index])
  }

  function abrirConfirmacao() {
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Confirmar recebimento' }))
  }

  it('exibe a ação somente para recebimentos pendentes ou atrasados', async () => {
    await renderizarComDados()

    expect(acoesDaLinha(1).getByRole('button', { name: 'Confirmar recebimento' })).toBeInTheDocument()
    expect(acoesDaLinha(2).getByRole('button', { name: 'Confirmar recebimento' })).toBeInTheDocument()

    trocarVisualizacao('Recebidas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Confirmar recebimento' }))
      .not.toBeInTheDocument()

    trocarVisualizacao('Canceladas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Confirmar recebimento' }))
      .not.toBeInTheDocument()
  })

  it('abre o formulário com o valor esperado e exige a data efetiva', async () => {
    await renderizarComDados()
    abrirConfirmacao()

    const formulario = screen.getByRole('region', { name: 'Confirmar recebimento' })
    expect(within(formulario).getByText(/Valor esperado: R\$/)).toBeInTheDocument()
    expect(within(formulario).getByLabelText('Data efetiva do recebimento')).toBeInTheDocument()
    expect(within(formulario).getByLabelText('Valor recebido (opcional)')).toBeInTheDocument()

    fireEvent.click(within(formulario).getByRole('button', { name: 'Confirmar recebimento' }))
    expect(within(formulario).getByText('A data efetiva do recebimento é obrigatória.')).toBeInTheDocument()
    expect(confirmReceivable).not.toHaveBeenCalled()
  })

  it('omite amount quando o valor é deixado em branco', async () => {
    await renderizarComDados()
    abrirConfirmacao()

    const formulario = screen.getByRole('region', { name: 'Confirmar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Data efetiva do recebimento'), {
      target: { value: '2026-11-05' },
    })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Confirmar recebimento' }))

    await waitFor(() => expect(confirmReceivable).toHaveBeenCalledTimes(1))
    expect(confirmReceivable).toHaveBeenCalledWith('r1', { receivedDate: '2026-11-05' })
    expect(confirmReceivable.mock.calls[0][1]).not.toHaveProperty('userId')
    expect(confirmReceivable.mock.calls[0][1]).not.toHaveProperty('familyGroupId')
  })

  it('envia o valor informado quando corresponde ao esperado', async () => {
    await renderizarComDados()
    abrirConfirmacao()

    const formulario = screen.getByRole('region', { name: 'Confirmar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Data efetiva do recebimento'), {
      target: { value: '2026-11-05' },
    })
    fireEvent.change(within(formulario).getByLabelText('Valor recebido (opcional)'), {
      target: { value: '5000,00' },
    })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Confirmar recebimento' }))

    await waitFor(() => expect(confirmReceivable).toHaveBeenCalledTimes(1))
    expect(confirmReceivable).toHaveBeenCalledWith('r1', {
      receivedDate: '2026-11-05',
      amount: 5000,
    })
  })

  it.each([
    ['4000,00', 'parcial'],
    ['6000,00', 'excedente'],
  ])('rejeita valor %s (%s)', async (valor) => {
    await renderizarComDados()
    abrirConfirmacao()

    const formulario = screen.getByRole('region', { name: 'Confirmar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Data efetiva do recebimento'), {
      target: { value: '2026-11-05' },
    })
    fireEvent.change(within(formulario).getByLabelText('Valor recebido (opcional)'), {
      target: { value: valor },
    })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Confirmar recebimento' }))

    expect(within(formulario).getByText('O valor recebido deve ser igual ao valor esperado.'))
      .toBeInTheDocument()
    expect(confirmReceivable).not.toHaveBeenCalled()
  })

  it('exibe carregamento e bloqueia duplo envio', async () => {
    let resolver
    confirmReceivable.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    await renderizarComDados()
    abrirConfirmacao()

    const formulario = screen.getByRole('region', { name: 'Confirmar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Data efetiva do recebimento'), {
      target: { value: '2026-11-05' },
    })
    const botao = within(formulario).getByRole('button', { name: 'Confirmar recebimento' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(confirmReceivable).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Confirmando...' })).toBeDisabled()

    await act(async () => { resolver({ status: 'RECEBIDA' }) })
  })

  it('confirma, recarrega a listagem com RECEBIDA e a próxima ocorrência do backend', async () => {
    listReceivables
      .mockResolvedValueOnce({ receivables: RECEBIMENTOS })
      .mockResolvedValueOnce({
        receivables: [
          ...RECEBIMENTOS.map((item) => (item.id === 'r1' ? { ...item, status: 'RECEBIDA' } : item)),
          {
            id: 'r5', recurrenceSeriesId: 's1', occurrenceNumber: 2,
            description: 'Salário', expectedAmount: 5000, expectedDate: '2026-12-05',
            receivedDate: null, recurrence: 'MENSAL', status: 'PENDENTE',
          },
        ],
      })

    await renderizarComDados()
    abrirConfirmacao()

    const formulario = screen.getByRole('region', { name: 'Confirmar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Data efetiva do recebimento'), {
      target: { value: '2026-11-05' },
    })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Confirmar recebimento' }))

    expect(await screen.findByText('Recebimento confirmado.')).toBeInTheDocument()
    await waitFor(() => expect(listReceivables).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('region', { name: 'Confirmar recebimento' })).not.toBeInTheDocument()

    const tabelaPendentes = screen.getByTestId('receivables-tabela')
    expect(within(tabelaPendentes).getAllByText('2').length).toBeGreaterThan(0)

    trocarVisualizacao('Recebidas')
    expect(within(tabelaHistorico()).getAllByText('Recebida').length).toBeGreaterThan(0)
  })

  it('mantém formulário e dados em caso de erro, permitindo nova tentativa', async () => {
    confirmReceivable.mockRejectedValueOnce(new ApiError({
      status: 400,
      erro: 'Recebimento inválido',
      messages: ['Somente recebimentos pendentes ou atrasados podem ser confirmados.'],
    }))

    await renderizarComDados()
    abrirConfirmacao()

    const formulario = screen.getByRole('region', { name: 'Confirmar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Data efetiva do recebimento'), {
      target: { value: '2026-11-05' },
    })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Confirmar recebimento' }))

    expect(await screen.findByText('Somente recebimentos pendentes ou atrasados podem ser confirmados.'))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Confirmar recebimento' })).toBeInTheDocument()
    expect(screen.getByLabelText('Data efetiva do recebimento')).toHaveValue('2026-11-05')

    fireEvent.click(within(formulario).getByRole('button', { name: 'Confirmar recebimento' }))
    await waitFor(() => expect(confirmReceivable).toHaveBeenCalledTimes(2))
  })

  it('não cria despesa ao confirmar um recebimento', async () => {
    await renderizarComDados()
    abrirConfirmacao()

    const formulario = screen.getByRole('region', { name: 'Confirmar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Data efetiva do recebimento'), {
      target: { value: '2026-11-05' },
    })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Confirmar recebimento' }))

    expect(await screen.findByText('Recebimento confirmado.')).toBeInTheDocument()
    expect(registerExpense).not.toHaveBeenCalled()
  })
})

describe('ReceivablesPage — edição individual', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Salário')
  }

  function acoesDaLinha(index) {
    const tabela = screen.getByTestId('receivables-tabela')
    return within(within(tabela).getAllByRole('row')[index])
  }

  it('exibe Editar somente para recebimentos pendentes ou atrasados', async () => {
    await renderizarComDados()

    expect(acoesDaLinha(1).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(acoesDaLinha(2).getByRole('button', { name: 'Editar' })).toBeInTheDocument()

    trocarVisualizacao('Recebidas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Editar' }))
      .not.toBeInTheDocument()

    trocarVisualizacao('Canceladas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Editar' }))
      .not.toBeInTheDocument()
  })

  it('abre o formulário preenchido com os dados atuais e permite cancelar', async () => {
    await renderizarComDados()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))
    const formulario = screen.getByRole('region', { name: 'Editar recebimento' })

    expect(within(formulario).getByLabelText('Descrição')).toHaveValue('Salário')
    expect(within(formulario).getByLabelText('Data prevista')).toHaveValue('2026-11-05')
    expect(within(formulario).getByText(/Ocorrência 1/)).toBeInTheDocument()

    fireEvent.click(within(formulario).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('region', { name: 'Editar recebimento' })).not.toBeInTheDocument()
    expect(updateReceivable).not.toHaveBeenCalled()
  })

  it('valida campos obrigatórios e valor positivo', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Descrição'), { target: { value: '' } })
    fireEvent.change(within(formulario).getByLabelText('Valor esperado'), { target: { value: '0' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))

    expect(within(formulario).getByText('A descrição do recebimento é obrigatória.')).toBeInTheDocument()
    expect(within(formulario).getByText('O valor esperado deve ser maior que zero.')).toBeInTheDocument()
    expect(updateReceivable).not.toHaveBeenCalled()
  })

  it('envia o payload exato com o ID da ocorrência e sem identificadores', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Descrição'), { target: { value: 'Salário revisado' } })
    fireEvent.change(within(formulario).getByLabelText('Valor esperado'), { target: { value: '5200,00' } })
    fireEvent.change(within(formulario).getByLabelText('Data prevista'), { target: { value: '2026-11-06' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(updateReceivable).toHaveBeenCalledTimes(1))
    expect(updateReceivable).toHaveBeenCalledWith('r1', {
      description: 'Salário revisado',
      expectedAmount: 5200,
      expectedDate: '2026-11-06',
    })
    expect(updateReceivable.mock.calls[0][1]).not.toHaveProperty('userId')
    expect(updateReceivable.mock.calls[0][1]).not.toHaveProperty('familyGroupId')
  })

  it('exibe carregamento e bloqueia duplo envio', async () => {
    let resolver
    updateReceivable.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar recebimento' })
    const salvar = within(formulario).getByRole('button', { name: 'Salvar' })
    fireEvent.click(salvar)
    fireEvent.click(salvar)

    expect(updateReceivable).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()

    await act(async () => { resolver({ id: 'r1' }) })
  })

  it('confirma a edição, atualiza a listagem e mantém as demais ocorrências', async () => {
    listReceivables
      .mockResolvedValueOnce({ receivables: RECEBIMENTOS })
      .mockResolvedValueOnce({
        receivables: RECEBIMENTOS.map((item) =>
          item.id === 'r1' ? { ...item, description: 'Salário revisado' } : item,
        ),
      })

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Descrição'), { target: { value: 'Salário revisado' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Recebimento atualizado.')).toBeInTheDocument()
    await waitFor(() => expect(listReceivables).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('region', { name: 'Editar recebimento' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Salário revisado').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Aluguel recebido').length).toBeGreaterThan(0)

    trocarVisualizacao('Recebidas')
    expect(screen.getAllByText('Freelance').length).toBeGreaterThan(0)
  })

  it('mantém formulário e dados em caso de erro, permitindo nova tentativa', async () => {
    updateReceivable.mockRejectedValueOnce(new ApiError({
      status: 400,
      erro: 'Alteração inválida',
      messages: ['Recebimentos recebidos não podem ser alterados.'],
    }))

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Descrição'), { target: { value: 'Valor digitado' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Recebimentos recebidos não podem ser alterados.'))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editar recebimento' })).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toHaveValue('Valor digitado')

    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(updateReceivable).toHaveBeenCalledTimes(2))
  })
})

describe('ReceivablesPage — cancelamento', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Salário')
  }

  function acoesDaLinha(index) {
    const tabela = screen.getByTestId('receivables-tabela')
    return within(within(tabela).getAllByRole('row')[index])
  }

  function abrirCancelamento() {
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Cancelar' }))
  }

  it('exibe Cancelar somente em recebimentos pendentes ou atrasados', async () => {
    await renderizarComDados()

    expect(acoesDaLinha(1).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(acoesDaLinha(2).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()

    const cards = screen.getByTestId('receivables-cards')
    expect(within(cards).getAllByRole('button', { name: 'Cancelar' })).toHaveLength(2)

    trocarVisualizacao('Recebidas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Cancelar' }))
      .not.toBeInTheDocument()

    trocarVisualizacao('Canceladas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Cancelar' }))
      .not.toBeInTheDocument()
  })

  it('solicita confirmação e permite voltar sem chamar a API', async () => {
    await renderizarComDados()
    abrirCancelamento()

    const dialogo = screen.getByRole('region', { name: 'Cancelar recebimento' })
    expect(within(dialogo).getByText(/Salário · R\$/)).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Cancelar somente esta ocorrência' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Cancelar esta e futuras' })).toBeInTheDocument()

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Voltar' }))

    expect(screen.queryByRole('region', { name: 'Cancelar recebimento' })).not.toBeInTheDocument()
    expect(cancelReceivable).not.toHaveBeenCalled()
  })

  it('envia SOMENTE_OCORRENCIA com o ID correto e apenas o scope', async () => {
    await renderizarComDados()
    abrirCancelamento()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar somente esta ocorrência' }))

    await waitFor(() => expect(cancelReceivable).toHaveBeenCalledTimes(1))
    expect(cancelReceivable).toHaveBeenCalledWith('r1', { scope: 'SOMENTE_OCORRENCIA' })
    expect(cancelReceivable.mock.calls[0][1]).not.toHaveProperty('userId')
    expect(cancelReceivable.mock.calls[0][1]).not.toHaveProperty('familyGroupId')
  })

  it('envia OCORRENCIA_E_FUTURAS com o ID correto', async () => {
    await renderizarComDados()
    abrirCancelamento()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar esta e futuras' }))

    await waitFor(() => expect(cancelReceivable).toHaveBeenCalledTimes(1))
    expect(cancelReceivable).toHaveBeenCalledWith('r1', { scope: 'OCORRENCIA_E_FUTURAS' })
  })

  it('exibe carregamento e bloqueia duplo envio', async () => {
    let resolver
    cancelReceivable.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    await renderizarComDados()
    abrirCancelamento()

    const botao = screen.getByRole('button', { name: 'Cancelar somente esta ocorrência' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(cancelReceivable).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('button', { name: 'Cancelando...' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled()

    await act(async () => { resolver({ status: 'CANCELADA' }) })
  })

  it('confirma o cancelamento, recarrega a listagem e atualiza o status', async () => {
    listReceivables
      .mockResolvedValueOnce({ receivables: RECEBIMENTOS })
      .mockResolvedValueOnce({
        receivables: RECEBIMENTOS.map((item) =>
          item.id === 'r1' ? { ...item, status: 'CANCELADA' } : item,
        ),
      })

    await renderizarComDados()
    abrirCancelamento()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar somente esta ocorrência' }))

    expect(await screen.findByText('Recebimento cancelado.')).toBeInTheDocument()
    await waitFor(() => expect(listReceivables).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('region', { name: 'Cancelar recebimento' })).not.toBeInTheDocument()
    expect(screen.queryByText('Salário')).not.toBeInTheDocument()

    trocarVisualizacao('Canceladas')

    const linha = within(tabelaHistorico()).getAllByRole('row')[1]
    expect(within(linha).getByText('Cancelada')).toBeInTheDocument()
    expect(within(linha).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  it('mantém a confirmação e permite nova tentativa em caso de erro', async () => {
    cancelReceivable.mockRejectedValueOnce(new ApiError({
      status: 400,
      erro: 'Cancelamento inválido',
      messages: ['Recebimentos confirmados não podem ser cancelados.'],
    }))

    await renderizarComDados()
    abrirCancelamento()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar somente esta ocorrência' }))

    expect(await screen.findByText('Recebimentos confirmados não podem ser cancelados.'))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Cancelar recebimento' })).toBeInTheDocument()
    expect(screen.queryByText('Recebimento cancelado.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar esta e futuras' }))
    await waitFor(() => expect(cancelReceivable).toHaveBeenCalledTimes(2))
  })
})

describe('ReceivablesPage — histórico', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Salário')
  }

  function acoesDaLinha(index) {
    const tabela = screen.getByTestId('receivables-tabela')
    return within(within(tabela).getAllByRole('row')[index])
  }

  it('oferece histórico para todas as contas e consulta o recebimento selecionado', async () => {
    await renderizarComDados()

    expect(acoesDaLinha(1).getByRole('button', { name: 'Histórico' })).toBeInTheDocument()
    expect(acoesDaLinha(2).getByRole('button', { name: 'Histórico' })).toBeInTheDocument()

    trocarVisualizacao('Recebidas')
    expect(within(tabelaHistorico())
      .getAllByRole('button', { name: 'Histórico' }).length).toBeGreaterThan(0)

    trocarVisualizacao('Canceladas')
    expect(within(tabelaHistorico())
      .getAllByRole('button', { name: 'Histórico' }).length).toBeGreaterThan(0)

    recolherHistorico()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))

    const painel = screen.getByRole('region', { name: 'Histórico do recebimento' })
    expect(within(painel).getByText(/Salário · Ocorrência 1/)).toBeInTheDocument()
    expect(getReceivableHistory).toHaveBeenCalledWith('r1')
  })

  it('exibe carregamento e depois as informações retornadas', async () => {
    let resolver
    getReceivableHistory.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))

    expect(screen.getByText('Carregando histórico...')).toBeInTheDocument()

    await act(async () => {
      resolver({
        receivableId: 'r1',
        history: [{
          id: 'h1', changedBy: 'Ana Silva', changedAt: '2026-11-05T10:00:00',
          previousStatus: 'PENDENTE', status: 'RECEBIDA',
          description: 'Salário', expectedAmount: 5000, expectedDate: '2026-11-05',
        }],
        confirmation: { amount: 5000, expectedDate: '2026-11-05', receivedDate: '2026-11-05', receivedBy: 'Ana Silva' },
      })
    })

    const historico = await screen.findByTestId('historico-recebimento')
    expect(within(historico).getByText('Pendente → Recebida')).toBeInTheDocument()
    expect(within(historico).getAllByText('05/11/2026').length).toBeGreaterThan(0)
    expect(within(historico).getAllByText('Ana Silva').length).toBeGreaterThan(0)
    expect(within(historico).getAllByText('R$ 5.000,00').length).toBeGreaterThan(0)
  })

  it('exibe estado vazio quando não há histórico nem confirmação', async () => {
    getReceivableHistory.mockResolvedValueOnce({ receivableId: 'r2', history: [], confirmation: null })

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(2).getByRole('button', { name: 'Histórico' }))

    expect(await screen.findByText('Nenhum registro de histórico encontrado.')).toBeInTheDocument()
  })

  it('exibe erro e permite tentar novamente', async () => {
    getReceivableHistory.mockRejectedValueOnce(new ApiError({
      status: 500,
      erro: 'Erro interno',
      messages: ['Não foi possível carregar o histórico.'],
    }))

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))

    expect(await screen.findByText('Não foi possível carregar o histórico.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => expect(getReceivableHistory).toHaveBeenCalledTimes(2))
    expect(await screen.findByTestId('historico-recebimento')).toBeInTheDocument()
  })

  it('não exibe histórico antigo ao trocar de recebimento', async () => {
    let resolverAntigo
    getReceivableHistory.mockImplementationOnce(() => new Promise((resolve) => { resolverAntigo = resolve }))
    getReceivableHistory.mockResolvedValueOnce({
      receivableId: 'r2', history: [], confirmation: null,
    })

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))
    await waitFor(() => expect(getReceivableHistory).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    fireEvent.click(acoesDaLinha(2).getByRole('button', { name: 'Histórico' }))
    await waitFor(() => expect(getReceivableHistory).toHaveBeenCalledTimes(2))

    expect(await screen.findByText('Nenhum registro de histórico encontrado.')).toBeInTheDocument()

    await act(async () => {
      resolverAntigo({
        receivableId: 'r1',
        history: [{
          id: 'h1', changedBy: 'Ana Silva', changedAt: '2026-11-05T10:00:00',
          previousStatus: 'PENDENTE', status: 'RECEBIDA',
          description: 'Salário', expectedAmount: 5000, expectedDate: '2026-11-05',
        }],
        confirmation: null,
      })
    })

    expect(screen.queryByText('Pendente → Recebida')).not.toBeInTheDocument()
    expect(screen.getByText('Nenhum registro de histórico encontrado.')).toBeInTheDocument()
  })

  it('fecha o histórico e retorna à listagem', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))

    await screen.findByTestId('historico-recebimento')
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('region', { name: 'Histórico do recebimento' })).not.toBeInTheDocument()
    expect(screen.getByTestId('receivables-tabela')).toBeInTheDocument()
    expect(screen.getAllByText('Salário').length).toBeGreaterThan(0)
  })
})

describe('ReceivablesPage — painel ativo e feedback (A1/A3)', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Salário')
  }

  function acoesDaLinha(index) {
    const tabela = screen.getByTestId('receivables-tabela')
    return within(within(tabela).getAllByRole('row')[index])
  }

  it('abre histórico após confirmação e mantém somente o histórico', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Confirmar recebimento' }))
    expect(screen.getByRole('region', { name: 'Confirmar recebimento' })).toBeInTheDocument()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))

    expect(screen.getByRole('region', { name: 'Histórico do recebimento' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Confirmar recebimento' })).not.toBeInTheDocument()
  })

  it('abre cancelamento após edição e mantém somente o cancelamento', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('region', { name: 'Editar recebimento' })).toBeInTheDocument()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByRole('region', { name: 'Cancelar recebimento' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Editar recebimento' })).not.toBeInTheDocument()
  })

  it('abre edição após histórico e mantém somente a edição', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))
    expect(screen.getByRole('region', { name: 'Histórico do recebimento' })).toBeInTheDocument()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    expect(screen.getByRole('region', { name: 'Editar recebimento' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Histórico do recebimento' })).not.toBeInTheDocument()
  })

  it('ao navegar para o cadastro, nenhum painel anterior permanece', async () => {
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

    render(
      <MemoryRouter initialEntries={['/receivables']}>
        <AuthProvider>
          <Routes>
            <Route path="/receivables" element={<ReceivablesPage />} />
            <Route path="/receivables/new" element={<h1>Cadastro de recebimento</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(await screen.findAllByText('Salário')).not.toHaveLength(0)
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('region', { name: 'Editar recebimento' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar recebimento' }))

    expect(screen.getByRole('heading', { name: 'Cadastro de recebimento' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Editar recebimento' })).not.toBeInTheDocument()
  })

  it('fechar e reabrir a edição descarta alterações não salvas', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    let formulario = screen.getByRole('region', { name: 'Editar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Descrição'), { target: { value: 'Temporário' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Cancelar' }))

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))
    formulario = screen.getByRole('region', { name: 'Editar recebimento' })
    expect(within(formulario).getByLabelText('Descrição')).toHaveValue('Salário')
  })

  it('limpa feedback de sucesso ao iniciar outra operação', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Confirmar recebimento' }))

    const formulario = screen.getByRole('region', { name: 'Confirmar recebimento' })
    fireEvent.change(within(formulario).getByLabelText('Data efetiva do recebimento'), {
      target: { value: '2026-11-05' },
    })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Confirmar recebimento' }))

    expect(await screen.findByText('Recebimento confirmado.')).toBeInTheDocument()

    fireEvent.click(acoesDaLinha(2).getByRole('button', { name: 'Editar' }))

    expect(screen.queryByText('Recebimento confirmado.')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editar recebimento' })).toBeInTheDocument()
  })

  it('erro na edição não gera feedback de sucesso', async () => {
    updateReceivable.mockRejectedValueOnce(new ApiError({
      status: 400,
      erro: 'Alteração inválida',
      messages: ['Recebimentos recebidos não podem ser alterados.'],
    }))

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar recebimento' })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Recebimentos recebidos não podem ser alterados.'))
      .toBeInTheDocument()
    expect(screen.queryByText('Recebimento atualizado.')).not.toBeInTheDocument()
    expect(screen.queryByText('Recebimento confirmado.')).not.toBeInTheDocument()
    expect(screen.queryByText('Recebimento cancelado.')).not.toBeInTheDocument()
  })
})

describe('ReceivablesPage — ações e acessibilidade (A2/A4)', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Salário')
  }

  function acoesDaLinha(index) {
    const tabela = screen.getByTestId('receivables-tabela')
    return within(within(tabela).getAllByRole('row')[index])
  }

  it('agrupa as ações da tabela em um contêiner com nomes acessíveis', async () => {
    await renderizarComDados()

    const tabela = screen.getByTestId('receivables-tabela')
    expect(within(tabela).getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument()

    const linha = within(tabela).getAllByRole('row')[1]
    const grupo = linha.querySelector('.receivables__actions')
    expect(grupo).not.toBeNull()
    expect(within(grupo).getByRole('button', { name: 'Confirmar recebimento' })).toBeInTheDocument()
    expect(within(grupo).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(within(grupo).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(within(grupo).getByRole('button', { name: 'Histórico' })).toBeInTheDocument()
    expect(within(grupo).getByRole('button', { name: 'Confirmar recebimento' }))
      .toHaveAttribute('aria-label', 'Confirmar recebimento')
  })

  it('mantém as ações agrupadas nos cards mobile', async () => {
    await renderizarComDados()

    const cards = screen.getByTestId('receivables-cards')
    const grupos = cards.querySelectorAll('.receivables__actions')
    expect(grupos).toHaveLength(2)
    expect(within(grupos[0]).getByRole('button', { name: 'Histórico' })).toBeInTheDocument()
  })

  it('usa semântica de região para todos os painéis', async () => {
    await renderizarComDados()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('region', { name: 'Cancelar recebimento' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('region', { name: 'Editar recebimento' })).toBeInTheDocument()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))
    expect(screen.getByRole('region', { name: 'Histórico do recebimento' })).toBeInTheDocument()
  })

  it('fecha o painel com Escape e restaura o foco para o gatilho', async () => {
    await renderizarComDados()

    const gatilho = acoesDaLinha(1).getByRole('button', { name: 'Editar' })
    gatilho.focus()
    fireEvent.click(gatilho)

    const painel = screen.getByRole('region', { name: 'Editar recebimento' })
    expect(document.activeElement).toBe(painel)
    expect(painel).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('region', { name: 'Editar recebimento' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(gatilho)
  })

  it('mantém os rótulos dos botões de confirmação de cancelamento', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Cancelar' }))

    const painel = screen.getByRole('region', { name: 'Cancelar recebimento' })
    expect(within(painel).getByRole('button', { name: 'Cancelar somente esta ocorrência' }))
      .toBeInTheDocument()
    expect(within(painel).getByRole('button', { name: 'Cancelar esta e futuras' }))
      .toBeInTheDocument()
    expect(within(painel).getByRole('button', { name: 'Voltar' })).toBeInTheDocument()
  })
})

describe('ReceivablesPage — status e textos de cancelamento (M1/M4)', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Salário')
  }

  function acoesDaLinha(index) {
    const tabela = screen.getByTestId('receivables-tabela')
    return within(within(tabela).getAllByRole('row')[index])
  }

  it('diferencia visualmente os status PENDENTE e CANCELADA na tabela e nos cards', async () => {
    await renderizarComDados()

    const tabela = screen.getByTestId('receivables-tabela')
    const pendente = within(tabela).getAllByRole('row')[1].querySelector('[data-status="PENDENTE"]')
    expect(pendente).not.toBeNull()
    expect(pendente.className).toContain('receivables__status-tag--PENDENTE')
    expect(pendente).toHaveTextContent('Pendente')

    let cards = screen.getByTestId('receivables-cards')
    expect(cards.querySelector('[data-status="PENDENTE"]')).not.toBeNull()
    expect(cards.querySelector('[data-status="CANCELADA"]')).toBeNull()

    trocarVisualizacao('Canceladas')

    const cancelada = within(tabelaHistorico())
      .getAllByRole('row')[1].querySelector('[data-status="CANCELADA"]')
    expect(cancelada).not.toBeNull()
    expect(cancelada.className).toContain('receivables__status-tag--CANCELADA')
    expect(cancelada).toHaveTextContent('Cancelada')

    cards = screen.getByTestId('receivables-cards-historico')
    expect(cards.querySelector('[data-status="CANCELADA"]')).not.toBeNull()
  })

  it('explica a diferença entre as duas modalidades de cancelamento', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Cancelar' }))

    const painel = screen.getByRole('region', { name: 'Cancelar recebimento' })
    expect(within(painel).getByText(/Cancela apenas este recebimento/)).toBeInTheDocument()
    expect(within(painel).getByText(/As demais ocorrências da série permanecem ativas/))
      .toBeInTheDocument()
    expect(within(painel).getByText(/todas as ocorrências futuras ainda não recebidas/))
      .toBeInTheDocument()
    expect(within(painel).getByText(/encerrando a recorrência/)).toBeInTheDocument()
  })

  it.each([
    ['Cancelar somente esta ocorrência', 'SOMENTE_OCORRENCIA'],
    ['Cancelar esta e futuras', 'OCORRENCIA_E_FUTURAS'],
  ])('mantém o scope %s enviado como %s', async (rotulo, scope) => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Cancelar' }))

    fireEvent.click(screen.getByRole('button', { name: rotulo }))

    await waitFor(() => expect(cancelReceivable).toHaveBeenCalledTimes(1))
    expect(cancelReceivable).toHaveBeenCalledWith('r1', { scope })
  })
})

describe('ReceivablesPage — informações e acabamento (D/E)', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Salário')
  }

  function acoesDaLinha(index) {
    const tabela = screen.getByTestId('receivables-tabela')
    return within(within(tabela).getAllByRole('row')[index])
  }

  function abrirHistoricoDaLinha(index) {
    const tabela = screen.getByTestId('receivables-tabela')
    const linha = within(tabela).getAllByRole('row')[index]
    fireEvent.click(within(linha).getByRole('button', { name: 'Histórico' }))
  }

  it('mostra descrição, valor e data anteriores e atuais no histórico', async () => {
    getReceivableHistory.mockResolvedValueOnce({
      receivableId: 'r1',
      history: [{
        id: 'h1',
        changedBy: 'Ana Silva',
        changedAt: '2026-11-05T10:30:00',
        previousStatus: 'PENDENTE',
        status: 'ATRASADA',
        previousDescription: 'Salário antigo',
        description: 'Salário',
        previousExpectedAmount: 4000,
        expectedAmount: 5000,
        previousExpectedDate: '2026-11-01',
        expectedDate: '2026-11-05',
      }],
      confirmation: null,
    })

    await renderizarComDados()
    abrirHistoricoDaLinha(1)

    const historico = await screen.findByTestId('historico-recebimento')
    expect(within(historico).getByText(
      (_, el) => el.tagName === 'LI'
        && el.parentElement?.className === 'receivables__history-changes'
        && el.textContent.includes('Salário antigo → Salário'),
    )).toBeInTheDocument()
    expect(within(historico).getByText(
      (_, el) => el.tagName === 'LI'
        && el.parentElement?.className === 'receivables__history-changes'
        && el.textContent.includes('Valor esperado:')
        && el.textContent.includes('4.000')
        && el.textContent.includes('5.000'),
    )).toBeInTheDocument()
    expect(within(historico).getByText(
      (_, el) => el.tagName === 'LI'
        && el.parentElement?.className === 'receivables__history-changes'
        && el.textContent.includes('01/11/2026 → 05/11/2026'),
    )).toBeInTheDocument()
    expect(within(historico).getAllByText('Alterações')).toHaveLength(1)
  })

  it('mostra data e hora da alteração e evita duplicar campos inalterados', async () => {
    getReceivableHistory.mockResolvedValueOnce({
      receivableId: 'r1',
      history: [{
        id: 'h1',
        changedBy: 'Ana Silva',
        changedAt: '2026-11-05T09:15:00',
        previousStatus: 'PENDENTE',
        status: 'RECEBIDA',
        previousDescription: 'Salário',
        description: 'Salário',
        previousExpectedAmount: 5000,
        expectedAmount: 5000,
        previousExpectedDate: '2026-11-05',
        expectedDate: '2026-11-05',
      }],
      confirmation: null,
    })

    await renderizarComDados()
    abrirHistoricoDaLinha(1)

    const historico = await screen.findByTestId('historico-recebimento')
    expect(within(historico).getByText('05/11/2026 09:15')).toBeInTheDocument()
    expect(within(historico).queryByText('Alterações')).not.toBeInTheDocument()
    expect(within(historico).getByText('Salário')).toBeInTheDocument()
    expect(within(historico).getAllByText(
      (_, el) => el.tagName === 'DD' && el.textContent.includes('5.000'),
    ).length).toBeGreaterThan(0)
  })

  it('exibe a data efetiva apenas para recebimentos recebidos', async () => {
    await renderizarComDados()

    const linhaPendente = within(screen.getByTestId('receivables-tabela'))
      .getAllByRole('row')[1]
    expect(within(linhaPendente).queryByText(/Efetiva/)).not.toBeInTheDocument()
    expect(screen.getByTestId('receivables-cards').textContent).not.toContain('Data efetiva')

    trocarVisualizacao('Recebidas')

    const linhaRecebida = within(tabelaHistorico()).getAllByRole('row')
      .find((linha) => linha.textContent.includes('Freelance'))
    expect(linhaRecebida.textContent).toContain('Efetiva: 20/10/2026')

    const cards = screen.getByTestId('receivables-cards-historico')
    expect(cards.textContent).toContain('Data efetiva')
    expect(cards.textContent).toContain('20/10/2026')
  })

  it('usa classes semânticas nas ações dos cards', async () => {
    await renderizarComDados()

    const cards = screen.getByTestId('receivables-cards')
    expect(cards.querySelectorAll('.receivables__action-button--card')).toHaveLength(10)
    expect(cards.querySelectorAll('.receivables__confirm-button--card')).toHaveLength(0)
  })

  it('mantém o botão de cadastro focável por teclado', async () => {
    await renderizarComDados()

    const botao = screen.getByRole('button', { name: 'Cadastrar recebimento' })
    expect(botao).toHaveClass('receivables__register')
    botao.focus()
    expect(document.activeElement).toBe(botao)
  })

  it('aplica classes de status diferentes nos cards', async () => {
    await renderizarComDados()

    let cards = screen.getByTestId('receivables-cards')
    expect(cards.querySelector('.receivables__item-card--PENDENTE')).not.toBeNull()
    expect(cards.querySelector('.receivables__item-card--ATRASADA')).not.toBeNull()
    expect(cards.querySelector('.receivables__item-card--RECEBIDA')).toBeNull()
    expect(cards.querySelector('.receivables__item-card--CANCELADA')).toBeNull()

    trocarVisualizacao('Recebidas')
    cards = screen.getByTestId('receivables-cards-historico')
    expect(cards.querySelector('.receivables__item-card--RECEBIDA')).not.toBeNull()

    trocarVisualizacao('Canceladas')
    cards = screen.getByTestId('receivables-cards-historico')
    expect(cards.querySelector('.receivables__item-card--CANCELADA')).not.toBeNull()
  })

  it('mantém rótulos acessíveis nos formulários', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const painel = screen.getByRole('region', { name: 'Editar recebimento' })
    const rotulo = within(painel).getByText('Descrição')
    expect(rotulo.tagName).toBe('LABEL')
    expect(within(painel).getByLabelText('Descrição')).toBeInTheDocument()
  })
})

describe('ReceivablesPage — operações pendentes e histórico', () => {
  async function renderizarComDados() {
    renderizar()
    expect(await screen.findAllByText('Salário')).not.toHaveLength(0)
  }

  it('exibe apenas recebimentos pendentes e atrasados por padrão, com o histórico recolhido', async () => {
    await renderizarComDados()

    const tabela = screen.getByTestId('receivables-tabela')
    expect(within(tabela).getByText('Salário')).toBeInTheDocument()
    expect(within(tabela).getByText('Aluguel recebido')).toBeInTheDocument()
    expect(within(tabela).queryByText('Freelance')).not.toBeInTheDocument()
    expect(within(tabela).queryByText('Dividendo cancelado')).not.toBeInTheDocument()
    expect(screen.getByTestId('receivables-historico-toggle'))
      .toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('region', { name: 'Histórico de recebimentos' }))
      .not.toBeInTheDocument()
  })

  it('expande e recolhe o histórico', async () => {
    await renderizarComDados()
    const toggle = screen.getByTestId('receivables-historico-toggle')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'Histórico de recebimentos' })).toBeInTheDocument()
    expect(within(tabelaHistorico()).getByText('Freelance')).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('region', { name: 'Histórico de recebimentos' }))
      .not.toBeInTheDocument()
    expect(screen.getByTestId('receivables-tabela')).toBeInTheDocument()
  })

  it('mantém os recebimentos recebidos acessíveis no histórico', async () => {
    await renderizarComDados()
    trocarVisualizacao('Recebidas')

    const tabela = tabelaHistorico()
    expect(within(tabela).getByText('Freelance')).toBeInTheDocument()
    expect(within(tabela).queryByText('Salário')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recebidas' }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('mantém os recebimentos cancelados acessíveis separadamente no histórico', async () => {
    await renderizarComDados()
    trocarVisualizacao('Canceladas')

    const tabela = tabelaHistorico()
    expect(within(tabela).getByText('Dividendo cancelado')).toBeInTheDocument()
    expect(within(tabela).queryByText('Freelance')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('receivables-cards-historico'))
      .getByText('Dividendo cancelado')).toBeInTheDocument()
  })

  it('exibe contadores no botão discreto e nas abas do histórico', async () => {
    await renderizarComDados()

    expect(screen.getByTestId('receivables-historico-toggle')
      .querySelector('.receivables__history-count')).toHaveTextContent('2')

    trocarVisualizacao('Recebidas')
    expect(screen.getByRole('button', { name: 'Recebidas' })
      .querySelector('.status-filter__count')).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: 'Canceladas' })
      .querySelector('.status-filter__count')).toHaveTextContent('1')
  })

  it('mantém o histórico individual funcionando e retorna à listagem ao recolher', async () => {
    await renderizarComDados()
    trocarVisualizacao('Recebidas')

    const linha = within(tabelaHistorico()).getAllByRole('row')[1]
    fireEvent.click(within(linha).getByRole('button', { name: 'Histórico' }))
    expect(screen.getByRole('region', { name: 'Histórico do recebimento' })).toBeInTheDocument()
    expect(getReceivableHistory).toHaveBeenCalledWith('r3')

    recolherHistorico()
    expect(screen.getByTestId('receivables-tabela')).toBeInTheDocument()
  })
})

describe('ReceivablesPage — edição de recorrência (REC-06)', () => {
  async function renderizarComDados(dados) {
    if (dados) listReceivables.mockResolvedValue({ receivables: dados })
    renderizar()
    expect(await screen.findAllByText('Salário')).not.toHaveLength(0)
  }

  function acoesDaLinha(index) {
    return within(within(screen.getByTestId('receivables-tabela')).getAllByRole('row')[index])
  }

  it('oferece Editar recorrência somente para séries mensais pendentes ou atrasadas', async () => {
    await renderizarComDados()

    expect(acoesDaLinha(1).getByRole('button', { name: 'Editar recorrência' })).toBeInTheDocument()
    expect(acoesDaLinha(2).getByRole('button', { name: 'Editar recorrência' })).toBeInTheDocument()

    trocarVisualizacao('Recebidas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Editar recorrência' }))
      .not.toBeInTheDocument()
  })

  it('não oferece edição de recorrência para recebimento sem recorrência', async () => {
    listReceivables.mockResolvedValue({
      receivables: [{
        ...RECEBIMENTOS[0], id: 'r-avulso', recurrence: 'SEM_RECORRENCIA', description: 'Avulso',
      }],
    })
    renderizar()
    expect(await screen.findAllByText('Avulso')).not.toHaveLength(0)

    const tabela = screen.getByTestId('receivables-tabela')
    expect(within(tabela).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(within(tabela).queryByRole('button', { name: 'Editar recorrência' })).not.toBeInTheDocument()
  })

  it('preserva a edição individual ao abrir o formulário correspondente', async () => {
    await renderizarComDados()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('region', { name: 'Editar recebimento' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Editar recorrência' })).not.toBeInTheDocument()
    expect(updateReceivableRecurrence).not.toHaveBeenCalled()
  })

  it('abre o formulário de recorrência preenchido com os dados da série', async () => {
    await renderizarComDados()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar recorrência' }))
    const formulario = screen.getByRole('region', { name: 'Editar recorrência' })

    expect(within(formulario).getByLabelText('Descrição da recorrência')).toHaveValue('Salário')
    expect(within(formulario).getByLabelText('Valor esperado')).toHaveValue(formatCurrency(5000))
    expect(within(formulario).getByLabelText('Próxima data prevista')).toHaveValue('2026-11-05')
    expect(within(formulario).getByLabelText('Dia de recorrência')).toHaveValue(5)
    expect(within(formulario).getByText(/somente às ocorrências futuras/)).toBeInTheDocument()
  })

  it('envia o payload do contrato, atualiza a listagem e exibe sucesso', async () => {
    await renderizarComDados()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar recorrência' }))
    const formulario = screen.getByRole('region', { name: 'Editar recorrência' })

    fireEvent.change(within(formulario).getByLabelText('Descrição da recorrência'), {
      target: { value: 'Salário ajustado' },
    })
    fireEvent.change(within(formulario).getByLabelText('Valor esperado'), { target: { value: '5500' } })
    fireEvent.change(within(formulario).getByLabelText('Próxima data prevista'), {
      target: { value: '2026-12-05' },
    })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar recorrência' }))

    await waitFor(() => {
      expect(updateReceivableRecurrence).toHaveBeenCalledWith('r1', {
        description: 'Salário ajustado',
        expectedAmount: 5500,
        nextExpectedDate: '2026-12-05',
        recurrenceDay: 5,
      })
    })
    expect(await screen.findByText(/Recorrência atualizada\. 2 ocorrência/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Editar recorrência' })).not.toBeInTheDocument()
    expect(listReceivables).toHaveBeenCalledTimes(2)
  })

  it('valida descrição, valor, dia e coerência da data antes de enviar', async () => {
    await renderizarComDados()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar recorrência' }))
    const formulario = screen.getByRole('region', { name: 'Editar recorrência' })
    const descricao = within(formulario).getByLabelText('Descrição da recorrência')
    const valor = within(formulario).getByLabelText('Valor esperado')
    const data = within(formulario).getByLabelText('Próxima data prevista')
    const dia = within(formulario).getByLabelText('Dia de recorrência')
    const salvar = within(formulario).getByRole('button', { name: 'Salvar recorrência' })

    fireEvent.change(descricao, { target: { value: '' } })
    fireEvent.change(valor, { target: { value: '0' } })
    fireEvent.change(dia, { target: { value: '32' } })
    fireEvent.click(salvar)
    expect(await screen.findByText('A descrição da recorrência é obrigatória.')).toBeInTheDocument()
    expect(screen.getByText('O valor esperado deve ser maior que zero.')).toBeInTheDocument()
    expect(screen.getByText('O dia de recorrência deve estar entre 1 e 31.')).toBeInTheDocument()

    fireEvent.change(descricao, { target: { value: 'Salário' } })
    fireEvent.change(valor, { target: { value: '5000' } })
    fireEvent.change(dia, { target: { value: '6' } })
    fireEvent.change(data, { target: { value: '2026-11-05' } })
    fireEvent.click(salvar)
    expect(screen.getByText('A data prevista deve corresponder ao dia de recorrência informado.'))
      .toBeInTheDocument()
    expect(updateReceivableRecurrence).not.toHaveBeenCalled()
  })

  it('exibe erro da API e permite tentar novamente', async () => {
    updateReceivableRecurrence
      .mockRejectedValueOnce(new ApiError({
        status: 400,
        erro: 'Recorrência inválida',
        messages: ['A configuração só pode ser alterada em uma recorrência mensal ativa.'],
      }))
      .mockResolvedValueOnce({
        recurrenceSeriesId: 's1', recurrence: 'MENSAL',
        nextExpectedDate: '2026-12-05', updatedOccurrences: 1,
      })
    await renderizarComDados()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar recorrência' }))
    const formulario = screen.getByRole('region', { name: 'Editar recorrência' })
    const salvar = within(formulario).getByRole('button', { name: 'Salvar recorrência' })

    fireEvent.click(salvar)
    expect(await screen.findByRole('alert'))
      .toHaveTextContent('A configuração só pode ser alterada em uma recorrência mensal ativa.')

    fireEvent.click(salvar)
    await waitFor(() => expect(updateReceivableRecurrence).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/Recorrência atualizada/)).toBeInTheDocument()
  })

  it('bloqueia submissões duplicadas enquanto salva a recorrência', async () => {
    let resolver
    updateReceivableRecurrence.mockImplementation(() => new Promise((resolve) => { resolver = resolve }))
    await renderizarComDados()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar recorrência' }))
    const formulario = screen.getByRole('region', { name: 'Editar recorrência' })
    const salvar = within(formulario).getByRole('button', { name: 'Salvar recorrência' })

    fireEvent.click(salvar)
    fireEvent.click(salvar)
    expect(updateReceivableRecurrence).toHaveBeenCalledTimes(1)
    expect(salvar).toBeDisabled()

    await act(async () => {
      resolver({
        recurrenceSeriesId: 's1', recurrence: 'MENSAL',
        nextExpectedDate: '2026-12-05', updatedOccurrences: 1,
      })
    })
    expect(await screen.findByText(/Recorrência atualizada/)).toBeInTheDocument()
  })
})
