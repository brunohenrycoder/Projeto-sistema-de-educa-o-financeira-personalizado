import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/errors.js'
import { AuthProvider } from '../../shared/auth/AuthContext.jsx'
import { formatCurrency } from '../../shared/format/currency.js'
import { registerExpense } from '../expenses/api/registerExpense.js'
import { listPayableBills } from './api/listPayableBills.js'
import { registerPayableBillPayment } from './api/registerPayableBillPayment.js'
import { updatePayableBill } from './api/updatePayableBill.js'
import { updatePayableBillRecurrence } from './api/updatePayableBillRecurrence.js'
import { cancelPayableBill } from './api/cancelPayableBill.js'
import { listPayableBillPayments } from './api/listPayableBillPayments.js'
import PayableBillsPage from './PayableBillsPage.jsx'

vi.mock('./api/listPayableBills.js', () => ({ listPayableBills: vi.fn() }))
vi.mock('./api/registerPayableBillPayment.js', () => ({ registerPayableBillPayment: vi.fn() }))
vi.mock('./api/updatePayableBill.js', () => ({ updatePayableBill: vi.fn() }))
vi.mock('./api/updatePayableBillRecurrence.js', () => ({ updatePayableBillRecurrence: vi.fn() }))
vi.mock('./api/cancelPayableBill.js', () => ({ cancelPayableBill: vi.fn() }))
vi.mock('./api/listPayableBillPayments.js', () => ({ listPayableBillPayments: vi.fn() }))
vi.mock('../expenses/api/registerExpense.js', () => ({ registerExpense: vi.fn() }))

const SESSION_KEY = 'aurora.session'

const CONTAS = [
  {
    id: 'b1', recurrenceSeriesId: 's1', occurrenceNumber: 1,
    description: 'Aluguel', amount: 1500, dueDate: '2026-11-20',
    category: 'MORADIA', recurrence: 'MENSAL', status: 'PENDENTE',
  },
  {
    id: 'b2', recurrenceSeriesId: 's2', occurrenceNumber: 1,
    description: 'Energia', amount: 200, dueDate: '2026-11-10',
    category: 'CONTAS_CONSUMO', recurrence: 'SEM_RECORRENCIA', status: 'ATRASADA',
  },
  {
    id: 'b3', recurrenceSeriesId: 's3', occurrenceNumber: 1,
    description: 'Internet', amount: 100, dueDate: '2026-11-05',
    category: 'ASSINATURAS', recurrence: 'MENSAL', status: 'PAGA',
  },
  {
    id: 'b4', recurrenceSeriesId: 's4', occurrenceNumber: 1,
    description: 'Telefone', amount: 80, dueDate: '2026-11-02',
    category: 'CONTAS_CONSUMO', recurrence: 'SEM_RECORRENCIA', status: 'CANCELADA',
  },
]

const PAGAMENTOS_POR_CONTA = {
  b1: [{
    id: 'p1', payableBillId: 'b1', expenseId: 'e1', amount: 1500,
    paymentDate: '2026-11-18', paymentMethod: 'PIX',
    paidByUserId: 'u1', paidByName: 'Ana Silva', createdAt: '2026-11-18T10:00:00',
  }],
  b2: [],
}

function prepararSessao() {
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
}

function Localizacao() {
  const location = useLocation()
  return <span data-testid="caminho">{location.pathname}</span>
}

function expandirHistorico() {
  const toggle = screen.getByTestId('payable-bills-historico-toggle')
  if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle)
}

function recolherHistorico() {
  const toggle = screen.getByTestId('payable-bills-historico-toggle')
  if (toggle.getAttribute('aria-expanded') === 'true') fireEvent.click(toggle)
}

function trocarVisualizacao(rotulo) {
  expandirHistorico()
  fireEvent.click(screen.getByRole('button', { name: rotulo }))
}

function tabelaHistorico() {
  return screen.getByTestId('payable-bills-tabela-historico')
}

function renderizar() {
  prepararSessao()

  return render(
    <MemoryRouter initialEntries={['/payable-bills']}>
      <AuthProvider>
        <Localizacao />
        <PayableBillsPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  listPayableBills.mockResolvedValue({ bills: CONTAS })
  registerPayableBillPayment.mockResolvedValue({
    paymentId: 'p1',
    payableBillId: 'b1',
    expenseId: 'e1',
    amount: 1500,
    paymentDate: '2026-11-19',
    paymentMethod: 'PIX',
    status: 'PAGA',
  })
  updatePayableBill.mockResolvedValue({ id: 'b1', status: 'PENDENTE' })
  updatePayableBillRecurrence.mockResolvedValue({ recurrenceSeriesId: 's1' })
  cancelPayableBill.mockResolvedValue({
    payableBillId: 'b1',
    status: 'CANCELADA',
    cancelledOccurrences: 1,
  })
  listPayableBillPayments.mockImplementation((id) =>
    Promise.resolve({ payments: PAGAMENTOS_POR_CONTA[id] ?? [] }),
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe('PayableBillsPage', () => {
  it('exibe carregamento e chama o serviço de listagem', async () => {
    renderizar()

    expect(screen.getByText('Carregando contas a pagar...')).toBeInTheDocument()
    expect(await screen.findAllByText('Aluguel')).not.toHaveLength(0)
    expect(listPayableBills).toHaveBeenCalledTimes(1)
  })

  it('exibe os dados retornados pelo backend na tabela e nos cards', async () => {
    renderizar()

    await screen.findAllByText('Aluguel')

    const tabela = screen.getByTestId('payable-bills-tabela')
    expect(within(tabela).getByText('Aluguel')).toBeInTheDocument()
    expect(within(tabela).getByText(
      (_, elemento) => elemento.tagName === 'TD' && elemento.textContent === formatCurrency(1500),
    )).toBeInTheDocument()
    expect(within(tabela).getByText('20/11/2026')).toBeInTheDocument()
    expect(within(tabela).getByText('MORADIA')).toBeInTheDocument()
    expect(within(tabela).getAllByText('Mensal').length).toBeGreaterThan(0)

    const cards = screen.getByTestId('payable-bills-cards')
    expect(within(cards).getByText('Energia')).toBeInTheDocument()
    expect(within(cards).getByText(
      (_, elemento) => elemento.tagName === 'P' && elemento.textContent === formatCurrency(200),
    )).toBeInTheDocument()
  })

  it('apresenta os status com rótulos legíveis em cada visualização', async () => {
    renderizar()

    await screen.findAllByText('Aluguel')

    expect(screen.getByTestId('payable-bills-historico-toggle'))
      .toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Atrasada').length).toBeGreaterThan(0)
    expect(screen.queryByText('Paga')).not.toBeInTheDocument()

    trocarVisualizacao('Pagas')
    expect(within(tabelaHistorico()).getAllByText('Paga').length).toBeGreaterThan(0)

    trocarVisualizacao('Canceladas')
    expect(within(tabelaHistorico()).getAllByText('Cancelada').length).toBeGreaterThan(0)
  })

  it('destaca contas atrasadas', async () => {
    renderizar()

    await screen.findAllByText('Energia')

    expect(screen.getByText('1 conta atrasada')).toBeInTheDocument()
    expect(screen.getAllByText('Atrasada').length).toBeGreaterThan(0)
    const tabela = screen.getByTestId('payable-bills-tabela')
    expect(within(tabela).getAllByText('Atrasada').length).toBeGreaterThan(0)
  })

  it('exibe estado vazio quando não há contas', async () => {
    listPayableBills.mockResolvedValue({ bills: [] })

    renderizar()

    expect(await screen.findByText('Nenhuma conta a pagar encontrada.')).toBeInTheDocument()
    expect(screen.queryByTestId('payable-bills-tabela')).not.toBeInTheDocument()
  })

  it('exibe erro da API e permite tentar novamente', async () => {
    mockErroUnico()

    renderizar()

    expect(await screen.findByText('Não foi possível carregar as contas.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => expect(listPayableBills).toHaveBeenCalledTimes(2))
    expect(await screen.findAllByText('Aluguel')).not.toHaveLength(0)
  })

  it('não aplica resposta recebida após a desmontagem da página', async () => {
    let resolver
    listPayableBills.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    const { unmount } = renderizar()
    await waitFor(() => expect(listPayableBills).toHaveBeenCalledTimes(1))

    unmount()

    await act(async () => { resolver({ bills: CONTAS }) })

    expect(screen.queryByTestId('payable-bills-tabela')).not.toBeInTheDocument()
    expect(screen.queryAllByText('Aluguel')).toHaveLength(0)
  })

  it('oferece ação local que navega para o cadastro', async () => {
    renderizar()
    await screen.findAllByText('Aluguel')

    const botao = screen.getByRole('button', { name: 'Cadastrar conta' })
    expect(botao).toBeInTheDocument()

    fireEvent.click(botao)
    expect(screen.getByTestId('caminho')).toHaveTextContent('/payable-bills/new')
  })
})

describe('PayableBillsPage — quitação', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Aluguel')
  }

  function abrirPagamentoDaPrimeiraConta() {
    const tabela = screen.getByTestId('payable-bills-tabela')
    const linha = within(tabela).getAllByRole('row')[1]
    fireEvent.click(within(linha).getByRole('button', { name: 'Quitar' }))
  }

  function preencherPagamento({ paymentDate = '2026-11-19', paymentMethod = 'PIX', amount } = {}) {
    fireEvent.change(screen.getByLabelText('Data do pagamento'), { target: { value: paymentDate } })
    fireEvent.change(screen.getByLabelText('Forma de pagamento'), { target: { value: paymentMethod } })
    if (amount !== undefined) {
      fireEvent.change(screen.getByLabelText(/^Valor/), { target: { value: amount } })
    }
  }

  it('oferece Quitar apenas para contas pendentes ou atrasadas', async () => {
    await renderizarComDados()

    expect(screen.getAllByRole('button', { name: 'Quitar' })).toHaveLength(4)

    trocarVisualizacao('Pagas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Quitar' }))
      .not.toBeInTheDocument()

    trocarVisualizacao('Canceladas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Quitar' }))
      .not.toBeInTheDocument()
  })

  it('abre formulário com data, forma de pagamento e valor opcional', async () => {
    await renderizarComDados()
    abrirPagamentoDaPrimeiraConta()

    const formulario = screen.getByRole('region', { name: 'Quitar conta' })
    expect(within(formulario).getByLabelText('Data do pagamento')).toBeInTheDocument()
    expect(within(formulario).getByLabelText('Forma de pagamento')).toBeInTheDocument()
    expect(within(formulario).getByLabelText(/^Valor/)).toBeInTheDocument()
    expect(within(formulario).getByRole('option', { name: 'Cartão de crédito' })).toBeInTheDocument()
  })

  it('exige data e forma de pagamento', async () => {
    await renderizarComDados()
    abrirPagamentoDaPrimeiraConta()

    const formulario = screen.getByRole('region', { name: 'Quitar conta' })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Confirmar pagamento' }))

    expect(within(formulario).getByText('A data do pagamento é obrigatória.')).toBeInTheDocument()
    expect(within(formulario).getByText('O método de pagamento é obrigatório.')).toBeInTheDocument()
    expect(registerPayableBillPayment).not.toHaveBeenCalled()
  })

  it('envia o id da conta e omite o valor quando não informado', async () => {
    await renderizarComDados()
    abrirPagamentoDaPrimeiraConta()
    preencherPagamento()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pagamento' }))

    await waitFor(() => expect(registerPayableBillPayment).toHaveBeenCalledTimes(1))
    expect(registerPayableBillPayment).toHaveBeenCalledWith('b1', {
      paymentDate: '2026-11-19',
      paymentMethod: 'PIX',
    })
    expect(registerPayableBillPayment.mock.calls[0][1]).not.toHaveProperty('userId')
    expect(registerPayableBillPayment.mock.calls[0][1]).not.toHaveProperty('familyGroupId')
  })

  it('envia o valor informado quando preenchido', async () => {
    await renderizarComDados()
    abrirPagamentoDaPrimeiraConta()
    preencherPagamento({ paymentMethod: 'CARTAO_CREDITO', amount: '1500,00' })

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pagamento' }))

    await waitFor(() => expect(registerPayableBillPayment).toHaveBeenCalledTimes(1))
    expect(registerPayableBillPayment).toHaveBeenCalledWith('b1', {
      paymentDate: '2026-11-19',
      paymentMethod: 'CARTAO_CREDITO',
      amount: 1500,
    })
  })

  it('exibe carregamento e bloqueia duplo envio', async () => {
    let resolver
    registerPayableBillPayment.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    await renderizarComDados()
    abrirPagamentoDaPrimeiraConta()
    preencherPagamento()

    const botao = screen.getByRole('button', { name: 'Confirmar pagamento' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(registerPayableBillPayment).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Quitando...' })).toBeDisabled()

    await act(async () => { resolver({ status: 'PAGA' }) })
  })

  it('confirma a quitação, recarrega a listagem e atualiza o status para PAGA', async () => {
    listPayableBills
      .mockResolvedValueOnce({ bills: CONTAS })
      .mockResolvedValueOnce({
        bills: CONTAS.map((conta) => (conta.id === 'b1' ? { ...conta, status: 'PAGA' } : conta)),
      })

    await renderizarComDados()
    abrirPagamentoDaPrimeiraConta()
    preencherPagamento()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pagamento' }))

    expect(await screen.findByText('Conta quitada.')).toBeInTheDocument()
    await waitFor(() => expect(listPayableBills).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('region', { name: 'Quitar conta' })).not.toBeInTheDocument()
    expect(screen.queryByText('Aluguel')).not.toBeInTheDocument()

    trocarVisualizacao('Pagas')

    const tabela = tabelaHistorico()
    const linha = within(tabela).getAllByRole('row')[1]
    expect(within(linha).getByText('Paga')).toBeInTheDocument()
    expect(within(linha).queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument()
  })

  it('mantém o formulário e os dados em caso de erro e permite nova tentativa', async () => {
    registerPayableBillPayment.mockRejectedValueOnce(new ApiError({
      status: 400,
      erro: 'Pagamento inválido',
      messages: ['A conta deve ser quitada integralmente em um único pagamento.'],
    }))

    await renderizarComDados()
    abrirPagamentoDaPrimeiraConta()
    preencherPagamento({ amount: '10,00' })

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pagamento' }))

    expect(await screen.findByText('A conta deve ser quitada integralmente em um único pagamento.'))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Quitar conta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Data do pagamento')).toHaveValue('2026-11-19')
    expect(screen.getByLabelText('Forma de pagamento')).toHaveValue('PIX')

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pagamento' }))
    await waitFor(() => expect(registerPayableBillPayment).toHaveBeenCalledTimes(2))
  })

  it('não cria despesa manualmente ao quitar', async () => {
    await renderizarComDados()
    abrirPagamentoDaPrimeiraConta()
    preencherPagamento()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pagamento' }))

    expect(await screen.findByText('Conta quitada.')).toBeInTheDocument()
    expect(registerExpense).not.toHaveBeenCalled()
  })
})

describe('PayableBillsPage — edição', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Aluguel')
  }

  function acoesDaLinha(index) {
    const tabela = screen.getByTestId('payable-bills-tabela')
    return within(within(tabela).getAllByRole('row')[index])
  }

  it('exibe Editar somente em contas não pagas e não canceladas', async () => {
    await renderizarComDados()

    expect(acoesDaLinha(1).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(acoesDaLinha(2).getByRole('button', { name: 'Editar' })).toBeInTheDocument()

    trocarVisualizacao('Pagas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Editar' }))
      .not.toBeInTheDocument()

    trocarVisualizacao('Canceladas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Editar' }))
      .not.toBeInTheDocument()
  })

  it('exibe Editar recorrência somente em contas mensais não canceladas', async () => {
    await renderizarComDados()

    expect(acoesDaLinha(1).getByRole('button', { name: 'Editar recorrência' })).toBeInTheDocument()
    expect(acoesDaLinha(2).queryByRole('button', { name: 'Editar recorrência' })).not.toBeInTheDocument()

    trocarVisualizacao('Pagas')
    expect(within(tabelaHistorico())
      .getAllByRole('button', { name: 'Editar recorrência' }).length).toBeGreaterThan(0)

    trocarVisualizacao('Canceladas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Editar recorrência' }))
      .not.toBeInTheDocument()
  })

  it('abre a edição individual preenchida e permite cancelar sem chamar a API', async () => {
    await renderizarComDados()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))
    const formulario = screen.getByRole('region', { name: 'Editar conta' })

    expect(within(formulario).getByLabelText('Descrição')).toHaveValue('Aluguel')
    expect(within(formulario).getByLabelText('Categoria')).toHaveValue('MORADIA')
    expect(within(formulario).getByLabelText('Data de vencimento')).toHaveValue('2026-11-20')
    expect(within(formulario).queryByLabelText('Próximo vencimento')).not.toBeInTheDocument()

    fireEvent.click(within(formulario).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('region', { name: 'Editar conta' })).not.toBeInTheDocument()
    expect(updatePayableBill).not.toHaveBeenCalled()
  })

  it('valida os campos da edição individual', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar conta' })
    fireEvent.change(within(formulario).getByLabelText('Descrição'), { target: { value: '' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))

    expect(within(formulario).getByText('A descrição da conta é obrigatória.')).toBeInTheDocument()
    expect(updatePayableBill).not.toHaveBeenCalled()
  })

  it('envia o payload individual com o ID correto e sem identificadores', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar conta' })
    fireEvent.change(within(formulario).getByLabelText('Descrição'), { target: { value: 'Aluguel atualizado' } })
    fireEvent.change(within(formulario).getByLabelText('Categoria'), { target: { value: 'OUTROS' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(updatePayableBill).toHaveBeenCalledTimes(1))
    expect(updatePayableBill).toHaveBeenCalledWith('b1', {
      description: 'Aluguel atualizado',
      amount: 1500,
      category: 'OUTROS',
      dueDate: '2026-11-20',
    })
    expect(updatePayableBill.mock.calls[0][1]).not.toHaveProperty('userId')
    expect(updatePayableBill.mock.calls[0][1]).not.toHaveProperty('familyGroupId')
  })

  it('abre, cancela e envia a edição de recorrência com nextDueDate', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar recorrência' }))

    let formulario = screen.getByRole('region', { name: 'Editar recorrência' })
    expect(within(formulario).getByLabelText('Próximo vencimento')).toBeInTheDocument()
    expect(within(formulario).queryByLabelText('Data de vencimento')).not.toBeInTheDocument()

    fireEvent.click(within(formulario).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('region', { name: 'Editar recorrência' })).not.toBeInTheDocument()
    expect(updatePayableBillRecurrence).not.toHaveBeenCalled()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar recorrência' }))
    formulario = screen.getByRole('region', { name: 'Editar recorrência' })
    fireEvent.change(within(formulario).getByLabelText('Próximo vencimento'), {
      target: { value: '2026-12-20' },
    })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(updatePayableBillRecurrence).toHaveBeenCalledTimes(1))
    expect(updatePayableBillRecurrence).toHaveBeenCalledWith('b1', {
      description: 'Aluguel',
      amount: 1500,
      category: 'MORADIA',
      nextDueDate: '2026-12-20',
    })
  })

  it('bloqueia duplo envio e exibe carregamento', async () => {
    let resolver
    updatePayableBill.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar conta' })
    const salvar = within(formulario).getByRole('button', { name: 'Salvar' })
    fireEvent.click(salvar)
    fireEvent.click(salvar)

    expect(updatePayableBill).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()

    await act(async () => { resolver({ id: 'b1' }) })
  })

  it('mantém dados e formulário em caso de erro, permitindo nova tentativa', async () => {
    updatePayableBill.mockRejectedValueOnce(new ApiError({
      status: 400,
      erro: 'Dados inválidos',
      messages: ['Contas pagas ou canceladas não podem ser alteradas.'],
    }))

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar conta' })
    fireEvent.change(within(formulario).getByLabelText('Descrição'), { target: { value: 'Alterado' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Contas pagas ou canceladas não podem ser alteradas.'))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editar conta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toHaveValue('Alterado')

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(updatePayableBill).toHaveBeenCalledTimes(2))
  })

  it('confirma a edição e recarrega a listagem com o dado atualizado', async () => {
    listPayableBills
      .mockResolvedValueOnce({ bills: CONTAS })
      .mockResolvedValueOnce({
        bills: CONTAS.map((conta) =>
          conta.id === 'b1' ? { ...conta, description: 'Aluguel atualizado' } : conta,
        ),
      })

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Editar' }))

    const formulario = screen.getByRole('region', { name: 'Editar conta' })
    fireEvent.change(within(formulario).getByLabelText('Descrição'), { target: { value: 'Aluguel atualizado' } })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Conta atualizada.')).toBeInTheDocument()
    await waitFor(() => expect(listPayableBills).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('region', { name: 'Editar conta' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Aluguel atualizado').length).toBeGreaterThan(0)
  })
})

describe('PayableBillsPage — cancelamento', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Aluguel')
  }

  function acoesDaLinha(index) {
    const tabela = screen.getByTestId('payable-bills-tabela')
    return within(within(tabela).getAllByRole('row')[index])
  }

  function abrirConfirmacao() {
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Cancelar conta' }))
  }

  it('oferece Cancelar conta somente em contas pendentes ou atrasadas', async () => {
    await renderizarComDados()

    expect(acoesDaLinha(1).getByRole('button', { name: 'Cancelar conta' })).toBeInTheDocument()
    expect(acoesDaLinha(2).getByRole('button', { name: 'Cancelar conta' })).toBeInTheDocument()

    trocarVisualizacao('Pagas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Cancelar conta' }))
      .not.toBeInTheDocument()

    trocarVisualizacao('Canceladas')
    expect(within(tabelaHistorico()).queryByRole('button', { name: 'Cancelar conta' }))
      .not.toBeInTheDocument()
  })

  it('abre confirmação com a conta e as duas modalidades, e permite voltar sem chamar a API', async () => {
    await renderizarComDados()
    abrirConfirmacao()

    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByText('Aluguel · R$ 1.500,00')).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Cancelar somente esta ocorrência' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Cancelar esta e futuras' })).toBeInTheDocument()

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Voltar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(cancelPayableBill).not.toHaveBeenCalled()
  })

  it('envia SOMENTE_OCORRENCIA com o ID da conta e apenas o scope', async () => {
    await renderizarComDados()
    abrirConfirmacao()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar somente esta ocorrência' }))

    await waitFor(() => expect(cancelPayableBill).toHaveBeenCalledTimes(1))
    expect(cancelPayableBill).toHaveBeenCalledWith('b1', { scope: 'SOMENTE_OCORRENCIA' })
    expect(cancelPayableBill.mock.calls[0][1]).not.toHaveProperty('userId')
    expect(cancelPayableBill.mock.calls[0][1]).not.toHaveProperty('familyGroupId')
  })

  it('envia OCORRENCIA_E_FUTURAS com o ID da conta', async () => {
    await renderizarComDados()
    abrirConfirmacao()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar esta e futuras' }))

    await waitFor(() => expect(cancelPayableBill).toHaveBeenCalledTimes(1))
    expect(cancelPayableBill).toHaveBeenCalledWith('b1', { scope: 'OCORRENCIA_E_FUTURAS' })
  })

  it('exibe carregamento e bloqueia duplo envio', async () => {
    let resolver
    cancelPayableBill.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    await renderizarComDados()
    abrirConfirmacao()

    const botao = screen.getByRole('button', { name: 'Cancelar somente esta ocorrência' })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(cancelPayableBill).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('button', { name: 'Cancelando...' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled()

    await act(async () => { resolver({ status: 'CANCELADA' }) })
  })

  it('exibe erro, preserva a listagem e permite nova tentativa', async () => {
    cancelPayableBill.mockRejectedValueOnce(new ApiError({
      status: 400,
      erro: 'Cancelamento inválido',
      messages: ['Contas pagas não podem ser canceladas.'],
    }))

    await renderizarComDados()
    abrirConfirmacao()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar somente esta ocorrência' }))

    expect(await screen.findByText('Contas pagas não podem ser canceladas.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('Aluguel').length).toBeGreaterThan(0)
    expect(screen.queryByText('Conta cancelada.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar esta e futuras' }))
    await waitFor(() => expect(cancelPayableBill).toHaveBeenCalledTimes(2))
  })

  it('confirma o cancelamento e recarrega a listagem com o status CANCELADA', async () => {
    listPayableBills
      .mockResolvedValueOnce({ bills: CONTAS })
      .mockResolvedValueOnce({
        bills: CONTAS.map((conta) =>
          conta.id === 'b1' ? { ...conta, status: 'CANCELADA' } : conta,
        ),
      })

    await renderizarComDados()
    abrirConfirmacao()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar somente esta ocorrência' }))

    expect(await screen.findByText('Conta cancelada.')).toBeInTheDocument()
    await waitFor(() => expect(listPayableBills).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Aluguel')).not.toBeInTheDocument()

    trocarVisualizacao('Canceladas')

    const linha = within(tabelaHistorico()).getAllByRole('row')[1]
    expect(within(linha).getByText('Cancelada')).toBeInTheDocument()
    expect(within(linha).queryByRole('button', { name: 'Cancelar conta' }))
      .not.toBeInTheDocument()
  })
})

describe('PayableBillsPage — histórico de pagamentos', () => {
  async function renderizarComDados() {
    renderizar()
    await screen.findAllByText('Aluguel')
  }

  function acoesDaLinha(index) {
    const tabela = screen.getByTestId('payable-bills-tabela')
    return within(within(tabela).getAllByRole('row')[index])
  }

  it('oferece histórico para todas as contas e abre o painel da selecionada', async () => {
    await renderizarComDados()

    expect(acoesDaLinha(1).getByRole('button', { name: 'Histórico' })).toBeInTheDocument()
    expect(acoesDaLinha(2).getByRole('button', { name: 'Histórico' })).toBeInTheDocument()

    trocarVisualizacao('Pagas')
    expect(within(tabelaHistorico())
      .getAllByRole('button', { name: 'Histórico' }).length).toBeGreaterThan(0)

    trocarVisualizacao('Canceladas')
    expect(within(tabelaHistorico())
      .getAllByRole('button', { name: 'Histórico' }).length).toBeGreaterThan(0)

    recolherHistorico()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))

    const painel = screen.getByRole('region', { name: 'Histórico de pagamentos' })
    expect(within(painel).getByText('Aluguel · R$ 1.500,00')).toBeInTheDocument()
    expect(listPayableBillPayments).toHaveBeenCalledWith('b1')
  })

  it('exibe carregamento e depois os pagamentos com data, valor e forma de pagamento', async () => {
    let resolver
    listPayableBillPayments.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))

    expect(screen.getByText('Carregando histórico...')).toBeInTheDocument()

    await act(async () => { resolver({ payments: PAGAMENTOS_POR_CONTA.b1 }) })

    const historico = await screen.findByTestId('historico-pagamentos')
    expect(within(historico).getByText('18/11/2026')).toBeInTheDocument()
    expect(within(historico).getAllByText('R$ 1.500,00').length).toBeGreaterThan(0)
    expect(within(historico).getByText('Pix')).toBeInTheDocument()
    expect(within(historico).getByText('Ana Silva')).toBeInTheDocument()
  })

  it('exibe estado vazio quando a conta não possui pagamentos', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(2).getByRole('button', { name: 'Histórico' }))

    expect(listPayableBillPayments).toHaveBeenCalledWith('b2')
    expect(await screen.findByText('Nenhum pagamento registrado para esta conta.'))
      .toBeInTheDocument()
  })

  it('mantém o histórico isolado entre contas', async () => {
    await renderizarComDados()

    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))
    expect(await screen.findByText('Pix')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    fireEvent.click(acoesDaLinha(2).getByRole('button', { name: 'Histórico' }))

    await waitFor(() => expect(listPayableBillPayments).toHaveBeenLastCalledWith('b2'))
    expect(await screen.findByText('Nenhum pagamento registrado para esta conta.'))
      .toBeInTheDocument()
    expect(screen.queryByText('Pix')).not.toBeInTheDocument()
  })

  it('exibe erro e permite tentar novamente', async () => {
    listPayableBillPayments.mockRejectedValueOnce(new ApiError({
      status: 500,
      erro: 'Erro interno',
      messages: ['Não foi possível carregar o histórico.'],
    }))

    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))

    expect(await screen.findByText('Não foi possível carregar o histórico.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => expect(listPayableBillPayments).toHaveBeenCalledTimes(2))
    expect(await screen.findByTestId('historico-pagamentos')).toBeInTheDocument()
  })

  it('fecha o histórico e retorna à listagem preservando os dados', async () => {
    await renderizarComDados()
    fireEvent.click(acoesDaLinha(1).getByRole('button', { name: 'Histórico' }))

    await screen.findByTestId('historico-pagamentos')
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('region', { name: 'Histórico de pagamentos' }))
      .not.toBeInTheDocument()
    expect(screen.getByTestId('payable-bills-tabela')).toBeInTheDocument()
    expect(screen.getAllByText('Aluguel').length).toBeGreaterThan(0)
  })
})

function mockErroUnico() {
  listPayableBills
    .mockRejectedValueOnce(new ApiError({
      status: 500,
      erro: 'Erro interno',
      messages: ['Não foi possível carregar as contas.'],
    }))
}

describe('PayableBillsPage — operações pendentes e histórico', () => {
  async function renderizarComDados() {
    renderizar()
    expect(await screen.findAllByText('Aluguel')).not.toHaveLength(0)
  }

  it('exibe apenas contas pendentes e atrasadas por padrão, com o histórico recolhido', async () => {
    await renderizarComDados()

    const tabela = screen.getByTestId('payable-bills-tabela')
    expect(within(tabela).getByText('Aluguel')).toBeInTheDocument()
    expect(within(tabela).getByText('Energia')).toBeInTheDocument()
    expect(within(tabela).queryByText('Internet')).not.toBeInTheDocument()
    expect(within(tabela).queryByText('Telefone')).not.toBeInTheDocument()
    expect(screen.getByTestId('payable-bills-historico-toggle'))
      .toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('region', { name: 'Histórico de contas' }))
      .not.toBeInTheDocument()
  })

  it('expande e recolhe o histórico', async () => {
    await renderizarComDados()
    const toggle = screen.getByTestId('payable-bills-historico-toggle')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'Histórico de contas' })).toBeInTheDocument()
    expect(within(tabelaHistorico()).getByText('Internet')).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('region', { name: 'Histórico de contas' }))
      .not.toBeInTheDocument()
    expect(screen.getByTestId('payable-bills-tabela')).toBeInTheDocument()
  })

  it('mantém as contas pagas acessíveis no histórico', async () => {
    await renderizarComDados()
    trocarVisualizacao('Pagas')

    const tabela = tabelaHistorico()
    expect(within(tabela).getByText('Internet')).toBeInTheDocument()
    expect(within(tabela).queryByText('Aluguel')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pagas' }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('mantém as contas canceladas acessíveis separadamente no histórico', async () => {
    await renderizarComDados()
    trocarVisualizacao('Canceladas')

    const tabela = tabelaHistorico()
    expect(within(tabela).getByText('Telefone')).toBeInTheDocument()
    expect(within(tabela).queryByText('Internet')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('payable-bills-cards-historico'))
      .getByText('Telefone')).toBeInTheDocument()
  })

  it('exibe contadores no botão discreto e nas abas do histórico', async () => {
    await renderizarComDados()

    expect(screen.getByTestId('payable-bills-historico-toggle')
      .querySelector('.payable-bills__history-count')).toHaveTextContent('2')

    trocarVisualizacao('Pagas')
    expect(screen.getByRole('button', { name: 'Pagas' })
      .querySelector('.status-filter__count')).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: 'Canceladas' })
      .querySelector('.status-filter__count')).toHaveTextContent('1')
  })

  it('mantém o histórico individual funcionando e retorna à listagem ao recolher', async () => {
    await renderizarComDados()
    trocarVisualizacao('Pagas')

    const linha = within(tabelaHistorico()).getAllByRole('row')[1]
    fireEvent.click(within(linha).getByRole('button', { name: 'Histórico' }))
    expect(screen.getByRole('region', { name: 'Histórico de pagamentos' })).toBeInTheDocument()
    expect(listPayableBillPayments).toHaveBeenCalledWith('b3')

    recolherHistorico()
    expect(screen.getByTestId('payable-bills-tabela')).toBeInTheDocument()
  })
})
