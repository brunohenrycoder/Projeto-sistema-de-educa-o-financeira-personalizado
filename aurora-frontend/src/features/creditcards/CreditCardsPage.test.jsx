import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/errors.js'
import { AuthProvider } from '../../shared/auth/AuthContext.jsx'
import { formatCurrency } from '../../shared/format/currency.js'
import { listCreditCards } from './api/listCreditCards.js'
import { listCreditCardInvoices } from './api/listCreditCardInvoices.js'
import { createCreditCard } from './api/createCreditCard.js'
import { updateCreditCard } from './api/updateCreditCard.js'
import { deactivateCreditCard } from './api/deactivateCreditCard.js'
import CreditCardsPage from './CreditCardsPage.jsx'

vi.mock('./api/listCreditCards.js', () => ({ listCreditCards: vi.fn() }))
vi.mock('./api/listCreditCardInvoices.js', () => ({ listCreditCardInvoices: vi.fn() }))
vi.mock('./api/createCreditCard.js', () => ({ createCreditCard: vi.fn() }))
vi.mock('./api/updateCreditCard.js', () => ({ updateCreditCard: vi.fn() }))
vi.mock('./api/deactivateCreditCard.js', () => ({ deactivateCreditCard: vi.fn() }))

const SESSION_KEY = 'aurora.session'

const CARTAO = {
  id: 'c1',
  name: 'Cartão Principal',
  issuer: 'Banco do Brasil',
  network: 'VISA',
  otherNetworkName: null,
  lastFourDigits: '1234',
  totalLimit: 5000,
  limitUsed: 1500,
  limitAvailable: 3500,
  pendingCreditAmount: 0,
  limitExceeded: false,
  closingDay: 10,
  dueDay: 20,
  active: true,
  limitDisclaimer: 'Comprometimento calculado considerando parcelas futuras contratadas no Aurora.',
  createdAt: '2026-11-01T10:00:00',
  updatedAt: '2026-11-01T10:00:00',
}

function fatura(id, status, outstandingAmount) {
  return {
    id,
    cardId: 'c1',
    cycleStart: '2026-11-01',
    closingDate: '2026-11-10',
    dueDate: '2026-11-20',
    status,
    totalAmount: 1500,
    paidAmount: status === 'PAID' ? 1500 : 0,
    creditAmount: 0,
    outstandingAmount,
  }
}

const FATURAS = [
  fatura('i1', 'OPEN', 1500),
  fatura('i2', 'CLOSED', 1200),
  fatura('i3', 'PARTIALLY_PAID', 700),
  fatura('i4', 'OVERDUE', 400),
  fatura('i5', 'PAID', 0),
]

function textoMoeda(valor) {
  return (_, elemento) => elemento?.textContent === formatCurrency(valor)
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
    <MemoryRouter initialEntries={['/credit-cards']}>
      <AuthProvider>
        <Localizacao />
        <CreditCardsPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  listCreditCards.mockResolvedValue({ cards: [CARTAO] })
  listCreditCardInvoices.mockResolvedValue({ invoices: FATURAS })
  createCreditCard.mockResolvedValue({ ...CARTAO, id: 'c2', name: 'Novo Cartão' })
  updateCreditCard.mockResolvedValue({ ...CARTAO, totalLimit: 7000, limitAvailable: 5500 })
  deactivateCreditCard.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe('CreditCardsPage', () => {
  it('exibe os dados e os indicadores de limite retornados pelo backend', async () => {
    renderizar()

    await screen.findByText('Cartão Principal')
    const secaoCartao = screen.getByRole('region', { name: 'Cartão de crédito' })
    expect(within(secaoCartao).getByText('Cartão Principal')).toBeInTheDocument()
    expect(within(secaoCartao).getByText('Banco do Brasil · Visa · final 1234')).toBeInTheDocument()
    expect(within(secaoCartao).getByText('Limite total')).toBeInTheDocument()
    expect(within(secaoCartao).getByText(textoMoeda(5000))).toBeInTheDocument()
    expect(within(secaoCartao).getByText('Limite utilizado')).toBeInTheDocument()
    expect(within(secaoCartao).getByText(textoMoeda(1500))).toBeInTheDocument()
    expect(within(secaoCartao).getByText('Limite disponível')).toBeInTheDocument()
    expect(within(secaoCartao).getByText(textoMoeda(3500))).toBeInTheDocument()
    expect(within(secaoCartao).getByText(/Fechamento dia 10/)).toBeInTheDocument()
    expect(within(secaoCartao).getByText(CARTAO.limitDisclaimer)).toBeInTheDocument()
    expect(within(secaoCartao).getByText('Ativo')).toBeInTheDocument()
    expect(listCreditCards).toHaveBeenCalledTimes(1)
  })

  it('exibe o estado vazio quando não há cartão cadastrado', async () => {
    listCreditCards.mockResolvedValue({ cards: [] })

    renderizar()

    expect(await screen.findByText('Nenhum cartão de crédito cadastrado.')).toBeInTheDocument()
    expect(screen.getByText(/Cadastre um cartão/)).toBeInTheDocument()
  })

  it('sinaliza limite excedido e crédito pendente quando retornados pela API', async () => {
    listCreditCards.mockResolvedValue({
      cards: [{ ...CARTAO, limitExceeded: true, pendingCreditAmount: 250 }],
    })

    renderizar()

    expect(await screen.findByText('Limite comprometido excedido.')).toBeInTheDocument()
    expect(screen.getByText(/Crédito pendente de estorno:/))
      .toHaveTextContent(/250,00/)
  })

  it('exibe as faturas pendentes na listagem principal e mantém pagas no histórico recolhido', async () => {
    renderizar()

    const tabela = await screen.findByTestId('credit-cards-tabela')
    expect(within(tabela).getAllByText('Aberta').length).toBeGreaterThan(0)
    expect(within(tabela).getAllByText('Fechada').length).toBeGreaterThan(0)
    expect(within(tabela).getAllByText('Parcialmente paga').length).toBeGreaterThan(0)
    expect(within(tabela).getAllByText('Vencida').length).toBeGreaterThan(0)
    expect(within(tabela).queryByText('Paga')).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Histórico de faturas' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle.querySelector('.credit-cards__history-count')).toHaveTextContent('1')
    expect(screen.queryByTestId('credit-cards-historico-lista')).not.toBeInTheDocument()
  })

  it('permite expandir o histórico e acessar as faturas pagas', async () => {
    renderizar()
    await screen.findByTestId('credit-cards-tabela')

    const toggle = screen.getByRole('button', { name: 'Histórico de faturas' })
    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const historico = within(screen.getByRole('region', { name: 'Histórico de faturas pagas' }))
    expect(historico.getByTestId('credit-cards-historico-lista')).toBeInTheDocument()
    expect(historico.getAllByRole('button', { name: 'Ver detalhe' }).length).toBeGreaterThan(0)
  })

  it('filtra faturas pelo status usando o parâmetro suportado pelo backend', async () => {
    listCreditCardInvoices.mockImplementation(({ status } = {}) => Promise.resolve({
      invoices: status ? FATURAS.filter((item) => item.status === status) : FATURAS,
    }))

    renderizar()
    await screen.findByTestId('credit-cards-tabela')

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'OPEN' } })

    await waitFor(() => {
      expect(listCreditCardInvoices).toHaveBeenCalledWith({ status: 'OPEN' })
    })
    const tabela = await screen.findByTestId('credit-cards-tabela')
    expect(within(tabela).getAllByText('Aberta').length).toBeGreaterThan(0)
    expect(within(tabela).queryByText('Vencida')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Histórico de faturas' })).not.toBeInTheDocument()
  })

  it('exibe mensagem quando não há faturas cadastradas', async () => {
    listCreditCardInvoices.mockResolvedValue({ invoices: [] })

    renderizar()

    expect(await screen.findByText('Nenhuma fatura encontrada.')).toBeInTheDocument()
  })

  it('exibe mensagem específica quando o filtro não retorna resultados', async () => {
    listCreditCardInvoices.mockResolvedValue({ invoices: [] })

    renderizar()
    await screen.findByText('Nenhuma fatura encontrada.')
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'PAID' } })

    expect(await screen.findByText('Nenhuma fatura encontrada para o filtro selecionado.'))
      .toBeInTheDocument()
  })

  it('exibe carregamento de cartão e de faturas', () => {
    renderizar()

    expect(screen.getByText('Carregando cartão de crédito...')).toBeInTheDocument()
    expect(screen.getByText('Carregando faturas...')).toBeInTheDocument()
  })

  it('permite tentar novamente ao falhar o carregamento do cartão', async () => {
    listCreditCards.mockRejectedValueOnce(new ApiError({
      status: 500,
      erro: 'Erro interno',
      messages: ['Não foi possível carregar o cartão.'],
    }))

    renderizar()

    const secao = await screen.findByRole('region', { name: 'Cartão de crédito' })
    expect(await within(secao).findByText('Não foi possível carregar o cartão.'))
      .toBeInTheDocument()
    fireEvent.click(within(secao).getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(listCreditCards).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Cartão Principal')).toBeInTheDocument()
  })

  it('permite tentar novamente ao falhar o carregamento das faturas', async () => {
    listCreditCardInvoices
      .mockRejectedValueOnce(new ApiError({
        status: 503,
        erro: 'Indisponível',
        messages: ['Não foi possível carregar as faturas.'],
      }))
      .mockResolvedValue({ invoices: FATURAS })

    renderizar()

    const secao = await screen.findByRole('region', { name: 'Faturas' })
    expect(await within(secao).findByText('Não foi possível carregar as faturas.'))
      .toBeInTheDocument()
    fireEvent.click(within(secao).getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(listCreditCardInvoices).toHaveBeenCalledTimes(2))
    expect(await screen.findByTestId('credit-cards-tabela')).toBeInTheDocument()
  })

  it('navega para o detalhe usando o identificador real da fatura', async () => {
    renderizar()

    const tabela = await screen.findByTestId('credit-cards-tabela')
    const botoes = within(tabela).getAllByRole('button', { name: 'Ver detalhe' })
    fireEvent.click(botoes[0])

    expect(screen.getByTestId('caminho')).toHaveTextContent('/credit-cards/invoices/i1')
  })
})

function preencherFormulario(valores = {}) {
  const dados = {
    name: 'Cartão Principal',
    issuer: 'Banco do Brasil',
    network: 'VISA',
    otherNetworkName: '',
    lastFourDigits: '1234',
    totalLimit: '5000',
    closingDay: '10',
    dueDay: '20',
    ...valores,
  }

  fireEvent.change(screen.getByLabelText('Nome do cartão'), { target: { value: dados.name } })
  fireEvent.change(screen.getByLabelText('Banco emissor'), { target: { value: dados.issuer } })
  fireEvent.change(screen.getByLabelText('Bandeira'), { target: { value: dados.network } })
  if (dados.network === 'OUTRA') {
    fireEvent.change(screen.getByLabelText('Identificação da bandeira'), {
      target: { value: dados.otherNetworkName },
    })
  }
  fireEvent.change(screen.getByLabelText('Últimos quatro dígitos (opcional)'), {
    target: { value: dados.lastFourDigits },
  })
  fireEvent.change(screen.getByLabelText('Limite total'), { target: { value: dados.totalLimit } })
  fireEvent.change(screen.getByLabelText('Dia de fechamento'), { target: { value: dados.closingDay } })
  fireEvent.change(screen.getByLabelText('Dia de vencimento'), { target: { value: dados.dueDay } })
}

describe('CreditCardsPage — cadastro de cartão', () => {
  it('abre o formulário de cadastro a partir da página principal', async () => {
    renderizar()
    await screen.findByText('Cartão Principal')

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar cartão' }))

    const painel = screen.getByRole('region', { name: 'Cadastrar cartão' })
    expect(painel).toBeInTheDocument()
    expect(within(painel).getByLabelText('Nome do cartão')).toBeInTheDocument()
    expect(within(painel).getByLabelText('Bandeira')).toBeInTheDocument()
    expect(within(painel).getByLabelText('Limite total')).toBeInTheDocument()
  })

  it('valida campos obrigatórios antes de enviar', async () => {
    renderizar()
    await screen.findByText('Cartão Principal')
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar cartão' }))

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByText('O nome do cartão é obrigatório.')).toBeInTheDocument()
    expect(screen.getByText('O banco emissor é obrigatório.')).toBeInTheDocument()
    expect(screen.getByText('Selecione uma bandeira válida.')).toBeInTheDocument()
    expect(screen.getByText('Informe o limite total.')).toBeInTheDocument()
    expect(screen.getByText('O dia de fechamento deve estar entre 1 e 28.')).toBeInTheDocument()
    expect(screen.getByText('O dia de vencimento deve estar entre 1 e 28.')).toBeInTheDocument()
    expect(createCreditCard).not.toHaveBeenCalled()
  })

  it('valida limites, dígitos, dias e a bandeira OUTRA', async () => {
    renderizar()
    await screen.findByText('Cartão Principal')
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar cartão' }))
    preencherFormulario({
      network: 'OUTRA',
      otherNetworkName: '',
      lastFourDigits: '12',
      totalLimit: '0',
      closingDay: '30',
      dueDay: '0',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByText('Informe a identificação da bandeira, com 2 a 40 caracteres.'))
      .toBeInTheDocument()
    expect(screen.getByText('Informe exatamente os quatro últimos números.')).toBeInTheDocument()
    expect(screen.getByText('O limite total deve ser maior que zero.')).toBeInTheDocument()
    expect(screen.getByText('O dia de fechamento deve estar entre 1 e 28.')).toBeInTheDocument()
    expect(screen.getByText('O dia de vencimento deve estar entre 1 e 28.')).toBeInTheDocument()
    expect(createCreditCard).not.toHaveBeenCalled()
  })

  it('envia o payload exato, exibe sucesso e recarrega a listagem', async () => {
    renderizar()
    await screen.findByText('Cartão Principal')
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar cartão' }))
    preencherFormulario({
      name: 'Cartão Novo',
      issuer: 'Banco Inter',
      network: 'OUTRA',
      otherNetworkName: 'Bandeira Regional',
      lastFourDigits: '',
      totalLimit: '2500',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(createCreditCard).toHaveBeenCalledTimes(1))
    expect(createCreditCard).toHaveBeenCalledWith({
      name: 'Cartão Novo',
      issuer: 'Banco Inter',
      network: 'OUTRA',
      otherNetworkName: 'Bandeira Regional',
      lastFourDigits: null,
      totalLimit: 2500,
      closingDay: 10,
      dueDay: 20,
    })
    expect(await screen.findByText('Cartão cadastrado.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Cadastrar cartão' })).not.toBeInTheDocument()
    await waitFor(() => expect(listCreditCards).toHaveBeenCalledTimes(2))
  })

  it('exibe mensagens da API e mantém o formulário aberto', async () => {
    createCreditCard.mockRejectedValueOnce(new ApiError({
      status: 422,
      erro: 'Cartão inválido',
      messages: ['Já existe um cartão ativo no grupo familiar.'],
    }))
    renderizar()
    await screen.findByText('Cartão Principal')
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar cartão' }))
    preencherFormulario()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Já existe um cartão ativo no grupo familiar.'))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Cadastrar cartão' })).toBeInTheDocument()
  })

  it('bloqueia envio duplicado enquanto salva', async () => {
    let resolver
    createCreditCard.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))
    renderizar()
    await screen.findByText('Cartão Principal')
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar cartão' }))
    preencherFormulario()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvando...' }))

    expect(createCreditCard).toHaveBeenCalledTimes(1)
    await act(async () => { resolver({ ...CARTAO }) })
  })
})

describe('CreditCardsPage — edição e limite', () => {
  it('abre o formulário preenchido com os dados atuais', async () => {
    renderizar()
    await screen.findByText('Cartão Principal')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    const painel = screen.getByRole('region', { name: 'Editar cartão' })
    expect(within(painel).getByLabelText('Nome do cartão')).toHaveValue('Cartão Principal')
    expect(within(painel).getByLabelText('Bandeira')).toHaveValue('VISA')
    expect(within(painel).getByLabelText('Limite total')).toHaveValue(formatCurrency(5000))
    expect(within(painel).getByLabelText('Dia de fechamento')).toHaveValue(10)
    expect(within(painel).getByLabelText('Dia de vencimento')).toHaveValue(20)
  })

  it('envia a edição com o novo limite e atualiza a página', async () => {
    renderizar()
    await screen.findByText('Cartão Principal')
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    fireEvent.change(screen.getByLabelText('Limite total'), { target: { value: '7000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(updateCreditCard).toHaveBeenCalledTimes(1))
    expect(updateCreditCard).toHaveBeenCalledWith('c1', {
      name: 'Cartão Principal',
      issuer: 'Banco do Brasil',
      network: 'VISA',
      otherNetworkName: null,
      lastFourDigits: '1234',
      totalLimit: 7000,
      closingDay: 10,
      dueDay: 20,
    })
    expect(await screen.findByText('Cartão atualizado.')).toBeInTheDocument()
    await waitFor(() => expect(listCreditCards).toHaveBeenCalledTimes(2))
  })

  it('exibe erro da API na edição', async () => {
    updateCreditCard.mockRejectedValueOnce(new ApiError({
      status: 422,
      erro: 'Limite inválido',
      messages: ['O limite não pode ficar abaixo do valor comprometido.'],
    }))
    renderizar()
    await screen.findByText('Cartão Principal')
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('O limite não pode ficar abaixo do valor comprometido.'))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editar cartão' })).toBeInTheDocument()
  })
})

describe('CreditCardsPage — desativação de cartão', () => {
  it('exibe confirmação e permite cancelar sem chamar a API', async () => {
    renderizar()
    await screen.findByText('Cartão Principal')

    fireEvent.click(screen.getByRole('button', { name: 'Desativar' }))

    const painel = screen.getByRole('region', { name: 'Desativar cartão' })
    expect(painel).toBeInTheDocument()
    expect(within(painel).getByText(/Deseja desativar o cartão Cartão Principal/)).toBeInTheDocument()
    fireEvent.click(within(painel).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('region', { name: 'Desativar cartão' })).not.toBeInTheDocument()
    expect(deactivateCreditCard).not.toHaveBeenCalled()
  })

  it('confirma a desativação, exibe sucesso e recarrega a listagem', async () => {
    renderizar()
    await screen.findByText('Cartão Principal')
    fireEvent.click(screen.getByRole('button', { name: 'Desativar' }))

    fireEvent.click(screen.getByRole('button', { name: 'Desativar cartão' }))

    await waitFor(() => expect(deactivateCreditCard).toHaveBeenCalledWith('c1'))
    expect(await screen.findByText('Cartão desativado.')).toBeInTheDocument()
    await waitFor(() => expect(listCreditCards).toHaveBeenCalledTimes(2))
  })

  it('exibe erro da API na desativação', async () => {
    deactivateCreditCard.mockRejectedValueOnce(new ApiError({
      status: 404,
      erro: 'Não encontrado',
      messages: ['Cartão ativo não encontrado no grupo familiar.'],
    }))
    renderizar()
    await screen.findByText('Cartão Principal')
    fireEvent.click(screen.getByRole('button', { name: 'Desativar' }))

    fireEvent.click(screen.getByRole('button', { name: 'Desativar cartão' }))

    expect(await screen.findByText('Cartão ativo não encontrado no grupo familiar.'))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Desativar cartão' })).toBeInTheDocument()
  })
})

describe('CreditCardsPage — histórico de cartões desativados', () => {
  const INATIVO = { ...CARTAO, id: 'c2', name: 'Cartão Antigo', active: false }

  it('exibe somente cartões ativos na listagem principal', async () => {
    listCreditCards.mockResolvedValue({ cards: [CARTAO, INATIVO] })

    renderizar()

    await screen.findByText('Cartão Principal')
    const principal = screen.getByRole('region', { name: 'Cartão de crédito' })
    expect(within(principal).getByText('Cartão Principal')).toBeInTheDocument()
    expect(within(principal).queryByText('Cartão Antigo')).not.toBeInTheDocument()
  })

  it('mantém o histórico recolhido por padrão e exibe a quantidade de desativados', async () => {
    listCreditCards.mockResolvedValue({ cards: [CARTAO, INATIVO] })

    renderizar()
    await screen.findByText('Cartão Principal')

    const toggle = screen.getByRole('button', { name: 'Histórico de cartões desativados' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle.querySelector('.credit-cards__history-count')).toHaveTextContent('1')
    expect(screen.queryByRole('region', { name: 'Histórico de cartões desativados' }))
      .not.toBeInTheDocument()
  })

  it('expande e recolhe o histórico, exibindo e ocultando os cartões desativados', async () => {
    listCreditCards.mockResolvedValue({ cards: [CARTAO, INATIVO] })

    renderizar()
    await screen.findByText('Cartão Principal')

    const toggle = screen.getByRole('button', { name: 'Histórico de cartões desativados' })
    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const historico = screen.getByRole('region', { name: 'Histórico de cartões desativados' })
    expect(within(historico).getByText('Cartão Antigo')).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('region', { name: 'Histórico de cartões desativados' }))
      .not.toBeInTheDocument()
  })

  it('não oferece ações administrativas para cartões desativados', async () => {
    listCreditCards.mockResolvedValue({ cards: [CARTAO, INATIVO] })

    renderizar()
    await screen.findByText('Cartão Principal')
    fireEvent.click(screen.getByRole('button', { name: 'Histórico de cartões desativados' }))

    const lista = screen.getByTestId('credit-cards-cartoes-historico-lista')
    expect(within(lista).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(within(lista).queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument()
  })

  it('exibe estado vazio adequado quando não há cartões ativos', async () => {
    listCreditCards.mockResolvedValue({ cards: [INATIVO] })

    renderizar()

    expect(await screen.findByText('Nenhum cartão de crédito ativo.')).toBeInTheDocument()
    expect(screen.queryByText('Cartão Antigo')).not.toBeInTheDocument()
  })

  it('exibe histórico vazio quando não há cartões desativados', async () => {
    renderizar()
    await screen.findByText('Cartão Principal')

    const toggle = screen.getByRole('button', { name: 'Histórico de cartões desativados' })
    expect(toggle.querySelector('.credit-cards__history-count')).toHaveTextContent('0')

    fireEvent.click(toggle)
    expect(screen.getByText('Nenhum cartão desativado.')).toBeInTheDocument()
  })

  it('preserva o acesso às faturas e ao detalhe com cartões desativados presentes', async () => {
    listCreditCards.mockResolvedValue({ cards: [CARTAO, INATIVO] })

    renderizar()
    const tabela = await screen.findByTestId('credit-cards-tabela')
    fireEvent.click(within(tabela).getAllByRole('button', { name: 'Ver detalhe' })[0])

    expect(screen.getByTestId('caminho')).toHaveTextContent('/credit-cards/invoices/i1')
  })
})
