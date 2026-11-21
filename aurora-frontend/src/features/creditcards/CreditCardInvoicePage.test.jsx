import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/errors.js'
import { formatCurrency } from '../../shared/format/currency.js'
import { getCreditCardInvoice } from './api/getCreditCardInvoice.js'
import { registerCreditCardPayment } from './api/registerCreditCardPayment.js'
import { registerCreditCardRefund } from './api/registerCreditCardRefund.js'
import CreditCardInvoicePage from './CreditCardInvoicePage.jsx'

vi.mock('./api/getCreditCardInvoice.js', () => ({ getCreditCardInvoice: vi.fn() }))
vi.mock('./api/registerCreditCardPayment.js', () => ({ registerCreditCardPayment: vi.fn() }))
vi.mock('./api/registerCreditCardRefund.js', () => ({ registerCreditCardRefund: vi.fn() }))

const FATURA = {
  id: 'i1',
  cardId: 'c1',
  cycleStart: '2026-11-01',
  closingDate: '2026-11-10',
  dueDate: '2026-11-20',
  status: 'PARTIALLY_PAID',
  totalAmount: 1500,
  paidAmount: 500,
  creditAmount: 100,
  outstandingAmount: 900,
  installments: [
    {
      id: 'parc1', expenseId: 'e1', memberName: 'Ana Silva', category: 'ELETRODOMESTICOS',
      amount: 1000, paidAmount: 500, refundedAmount: 0, outstandingAmount: 500,
      installmentNumber: 1, installmentCount: 2, cancelled: false,
    },
    {
      id: 'parc2', expenseId: 'e2', memberName: 'João Silva', category: 'ALIMENTACAO',
      amount: 500, paidAmount: 0, refundedAmount: 0, outstandingAmount: 500,
      installmentNumber: 3, installmentCount: 3, cancelled: true,
    },
  ],
  payments: [{
    id: 'pg1', amount: 500, paidAt: '2026-11-15T10:30:00', registeredBy: 'Ana Silva',
  }],
  creditApplications: [{
    id: 'ca1', refundId: 'est1', amount: 100, remainingCredit: 50,
    appliedAt: '2026-11-16T11:00:00',
  }],
  refunds: [{
    id: 'est1', expenseId: 'e1', amount: 200,
    createdAt: '2026-11-14T09:00:00', registeredBy: 'Ana Silva',
  }],
}

function textoMoeda(valor) {
  return (_, elemento) => elemento?.textContent === formatCurrency(valor)
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/credit-cards/invoices/i1']}>
      <Routes>
        <Route path="/credit-cards/invoices/:invoiceId" element={<CreditCardInvoicePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getCreditCardInvoice.mockResolvedValue(FATURA)
  registerCreditCardPayment.mockResolvedValue({
    id: 'pg2', invoiceId: 'i1', amount: 300, paidAt: '2026-11-18T10:00:00',
    paidAmount: 800, outstandingAmount: 600, invoiceStatus: 'PARTIALLY_PAID',
  })
  registerCreditCardRefund.mockResolvedValue({
    id: 'est2', expenseId: 'e1', amount: 100, amountAppliedToFutureInstallments: 0,
    amountAppliedToInvoices: 100, pendingCreditAmount: 0, createdAt: '2026-11-18T10:00:00',
  })
})

afterEach(() => {
  cleanup()
})

describe('CreditCardInvoicePage', () => {
  it('exibe o resumo da fatura com os valores e status retornados pelo backend', async () => {
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Resumo da fatura' })).toBeInTheDocument()
    expect(screen.getByText('Fatura i1')).toBeInTheDocument()
    expect(screen.getByText(/Ciclo 01\/11\/2026 · Cartão c1/)).toBeInTheDocument()

    const resumo = within(screen.getByRole('region', { name: 'Resumo da fatura' }))
    expect(resumo.getByText('Parcialmente paga')).toBeInTheDocument()
    expect(resumo.getByText('Valor total')).toBeInTheDocument()
    expect(resumo.getByText(textoMoeda(1500))).toBeInTheDocument()
    expect(resumo.getByText('Valor pendente')).toBeInTheDocument()
    expect(resumo.getByText(textoMoeda(900))).toBeInTheDocument()
    expect(resumo.getByText('Valor pago')).toBeInTheDocument()
    expect(resumo.getByText(textoMoeda(500))).toBeInTheDocument()
    expect(resumo.getByText('Crédito aplicado')).toBeInTheDocument()
    expect(resumo.getByText(textoMoeda(100))).toBeInTheDocument()
    expect(resumo.getByText(/Fechamento em 10\/11\/2026 · Vencimento em 20\/11\/2026/))
      .toBeInTheDocument()
    expect(getCreditCardInvoice).toHaveBeenCalledWith('i1')
  })

  it('exibe os gastos e as parcelas da fatura', async () => {
    renderizar()

    const tabela = await screen.findByTestId('invoice-detail-instalments-tabela')
    expect(within(tabela).getByText('ELETRODOMESTICOS')).toBeInTheDocument()
    expect(within(tabela).getByText('Ana Silva')).toBeInTheDocument()
    expect(within(tabela).getByText('1/2')).toBeInTheDocument()
    expect(within(tabela).getAllByText('Ativa').length).toBeGreaterThan(0)
    expect(within(tabela).getByText('3/3')).toBeInTheDocument()
    expect(within(tabela).getByText('Cancelada')).toBeInTheDocument()

    const cards = within(screen.getByTestId('invoice-detail-instalments-cards'))
    expect(cards.getByText('e1')).toBeInTheDocument()
    expect(cards.getAllByText(/Estornado/).length).toBeGreaterThan(0)
  })

  it('exibe o histórico de pagamentos com valor, data e responsável', async () => {
    renderizar()

    const pagamentos = await screen.findByTestId('invoice-detail-payments')
    expect(within(pagamentos).getByText(/500,00/)).toBeInTheDocument()
    expect(within(pagamentos).getByText(/15\/11\/2026 10:30/)).toBeInTheDocument()
    expect(within(pagamentos).getByText(/Ana Silva/)).toBeInTheDocument()
  })

  it('exibe aplicações de crédito separadamente dos pagamentos', async () => {
    renderizar()

    const creditos = await screen.findByTestId('invoice-detail-credits')
    expect(within(creditos).getByText(/100,00/)).toBeInTheDocument()
    expect(within(creditos).getByText(
      (_, elemento) => elemento?.tagName === 'P'
        && elemento.textContent.includes('Crédito restante')
        && elemento.textContent.includes('50,00'),
    )).toBeInTheDocument()
    expect(within(creditos).getByText(/16\/11\/2026 11:00/)).toBeInTheDocument()
    expect(within(creditos).getByText(/Estorno est1/)).toBeInTheDocument()
  })

  it('exibe os estornos vinculados à fatura', async () => {
    renderizar()

    const estornos = await screen.findByTestId('invoice-detail-refunds')
    expect(within(estornos).getByText(/200,00/)).toBeInTheDocument()
    expect(within(estornos).getByText(/Compra e1/)).toBeInTheDocument()
    expect(within(estornos).getByText(/14\/11\/2026 09:00/)).toBeInTheDocument()
    expect(within(estornos).getByText(/Ana Silva/)).toBeInTheDocument()
  })

  it('trata normalmente a ausência de gastos e de cada histórico', async () => {
    getCreditCardInvoice.mockResolvedValue({
      ...FATURA,
      installments: [],
      payments: [],
      creditApplications: [],
      refunds: [],
    })

    renderizar()

    expect(await screen.findByText('Nenhum gasto encontrado nesta fatura.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum pagamento registrado nesta fatura.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma aplicação de crédito nesta fatura.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum estorno registrado nesta fatura.')).toBeInTheDocument()
  })

  it('não falha quando o backend retorna dados parciais', async () => {
    getCreditCardInvoice.mockResolvedValue({
      id: 'i1',
      cardId: 'c1',
      cycleStart: null,
      closingDate: null,
      dueDate: null,
      status: 'OPEN',
      totalAmount: 0,
      paidAmount: 0,
      creditAmount: 0,
      outstandingAmount: 0,
    })

    renderizar()

    expect(await screen.findByRole('heading', { name: 'Resumo da fatura' })).toBeInTheDocument()
    expect(screen.getByText('Nenhum gasto encontrado nesta fatura.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum pagamento registrado nesta fatura.')).toBeInTheDocument()
  })

  it('exibe carregamento enquanto consulta a fatura', () => {
    renderizar()

    expect(screen.getByText('Carregando fatura...')).toBeInTheDocument()
  })

  it('exibe erro e permite tentar novamente', async () => {
    getCreditCardInvoice
      .mockRejectedValueOnce(new ApiError({
        status: 500,
        erro: 'Erro interno',
        messages: ['Não foi possível carregar a fatura.'],
      }))
      .mockResolvedValue(FATURA)

    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a fatura.')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(getCreditCardInvoice).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('heading', { name: 'Resumo da fatura' })).toBeInTheDocument()
  })

  it('exibe mensagem quando a fatura não é encontrada', async () => {
    getCreditCardInvoice.mockResolvedValue(null)

    renderizar()

    expect(await screen.findByText('Fatura não encontrada.')).toBeInTheDocument()
  })

  it('oferece navegação de retorno para Cartões de crédito', async () => {
    renderizar()

    expect(await screen.findByText('Fatura i1')).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: 'Cartões de crédito' })
    expect(links.length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Voltar para Cartões de crédito' }))
      .toHaveAttribute('href', '/credit-cards')
  })

  it('oferece o fluxo de pagamento quando há saldo pendente', async () => {
    renderizar()

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar pagamento' }))

    const dialogo = screen.getByRole('dialog', { name: 'Registrar pagamento' })
    expect(within(dialogo).getByText(/Saldo pendente: R\$/)).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Valor do pagamento')).toBeInTheDocument()
  })

  it('não oferece pagamento quando a fatura não tem saldo pendente', async () => {
    getCreditCardInvoice.mockResolvedValue({ ...FATURA, outstandingAmount: 0, status: 'PAID' })
    renderizar()

    await screen.findByRole('heading', { name: 'Resumo da fatura' })
    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).not.toBeInTheDocument()
  })

  it('valida os dados antes de registrar o pagamento', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar pagamento' }))

    const campo = screen.getByLabelText('Valor do pagamento')
    const enviar = screen.getByRole('button', { name: 'Confirmar pagamento' })

    fireEvent.click(enviar)
    expect(await screen.findByText('Informe o valor do pagamento.')).toBeInTheDocument()

    fireEvent.change(campo, { target: { value: '0' } })
    fireEvent.click(enviar)
    expect(screen.getByText('O valor do pagamento deve ser maior que zero.')).toBeInTheDocument()

    fireEvent.change(campo, { target: { value: '1,001' } })
    fireEvent.click(enviar)
    expect(screen.getByText('Informe um valor válido com até duas casas decimais.')).toBeInTheDocument()

    fireEvent.change(campo, { target: { value: '901' } })
    fireEvent.click(enviar)
    expect(screen.getByText('O pagamento não pode ultrapassar o saldo pendente da fatura.')).toBeInTheDocument()

    expect(registerCreditCardPayment).not.toHaveBeenCalled()
  })

  it('registra o pagamento, recarrega a fatura e preserva o histórico', async () => {
    getCreditCardInvoice
      .mockResolvedValueOnce(FATURA)
      .mockResolvedValueOnce({
        ...FATURA,
        paidAmount: 800,
        outstandingAmount: 600,
        payments: [
          ...FATURA.payments,
          { id: 'pg2', amount: 300, paidAt: '2026-11-18T10:00:00', registeredBy: 'Ana Silva' },
        ],
      })
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar pagamento' }))

    fireEvent.change(screen.getByLabelText('Valor do pagamento'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pagamento' }))

    await waitFor(() => {
      expect(registerCreditCardPayment).toHaveBeenCalledWith('i1', { amount: 300 })
    })
    expect(await screen.findByText('Pagamento registrado.')).toBeInTheDocument()
    await waitFor(() => expect(getCreditCardInvoice).toHaveBeenCalledTimes(2))

    const resumo = within(screen.getByRole('region', { name: 'Resumo da fatura' }))
    expect(resumo.getByText(textoMoeda(800))).toBeInTheDocument()
    expect(resumo.getByText(textoMoeda(600))).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Registrar pagamento' })).not.toBeInTheDocument()

    const pagamentos = await screen.findByTestId('invoice-detail-payments')
    expect(within(pagamentos).getByText(textoMoeda(300))).toBeInTheDocument()
    expect(within(pagamentos).getByText(/500,00/)).toBeInTheDocument()
  })

  it('exibe erro da API e permite tentar novamente', async () => {
    registerCreditCardPayment
      .mockRejectedValueOnce(new ApiError({
        status: 422,
        erro: 'Pagamento inválido',
        messages: ['O valor do pagamento não pode ultrapassar o saldo pendente da fatura.'],
      }))
      .mockResolvedValueOnce({
        id: 'pg2', invoiceId: 'i1', amount: 200, paidAt: '2026-11-18T10:00:00',
        paidAmount: 700, outstandingAmount: 700, invoiceStatus: 'PARTIALLY_PAID',
      })
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar pagamento' }))

    const campo = screen.getByLabelText('Valor do pagamento')
    const enviar = screen.getByRole('button', { name: 'Confirmar pagamento' })
    fireEvent.change(campo, { target: { value: '200' } })
    fireEvent.click(enviar)

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('O valor do pagamento não pode ultrapassar o saldo pendente da fatura.')

    fireEvent.click(enviar)

    await waitFor(() => expect(registerCreditCardPayment).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Pagamento registrado.')).toBeInTheDocument()
  })

  it('bloqueia envios duplicados enquanto o pagamento está em andamento', async () => {
    let resolver
    registerCreditCardPayment.mockImplementation(() => new Promise((resolve) => { resolver = resolve }))
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar pagamento' }))

    fireEvent.change(screen.getByLabelText('Valor do pagamento'), { target: { value: '200' } })
    const enviar = screen.getByRole('button', { name: 'Confirmar pagamento' })
    fireEvent.click(enviar)
    fireEvent.click(enviar)

    expect(registerCreditCardPayment).toHaveBeenCalledTimes(1)
    expect(enviar).toBeDisabled()

    await act(async () => {
      resolver({
        id: 'pg2', invoiceId: 'i1', amount: 200, paidAt: '2026-11-18T10:00:00',
        paidAmount: 700, outstandingAmount: 700, invoiceStatus: 'PARTIALLY_PAID',
      })
    })
    expect(await screen.findByText('Pagamento registrado.')).toBeInTheDocument()
  })

  describe('Registro de estorno', () => {
    it('oferece estorno somente nas compras elegíveis', async () => {
      renderizar()

      await screen.findByRole('heading', { name: 'Resumo da fatura' })
      const botoes = screen.getAllByRole('button', { name: 'Estornar' })
      expect(botoes.length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: 'Registrar estorno' })).toBeInTheDocument()
      const tabela = screen.getByTestId('invoice-detail-instalments-tabela')
      expect(within(tabela).getAllByRole('button', { name: 'Estornar' })).toHaveLength(1)
    })

    it('não oferece estorno quando todas as parcelas da fatura estão canceladas', async () => {
      getCreditCardInvoice.mockResolvedValue({
        ...FATURA,
        installments: FATURA.installments.map((parcela) => ({ ...parcela, cancelled: true })),
      })
      renderizar()

      await screen.findByRole('heading', { name: 'Resumo da fatura' })
      expect(screen.queryByRole('button', { name: 'Estornar' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Registrar estorno' })).not.toBeInTheDocument()
    })

    it('seleciona a compra a partir da ação na parcela e exibe estornos anteriores', async () => {
      renderizar()
      const tabela = await screen.findByTestId('invoice-detail-instalments-tabela')
      fireEvent.click(within(tabela).getByRole('button', { name: 'Estornar' }))

      const dialogo = screen.getByRole('dialog', { name: 'Registrar estorno' })
      expect(within(dialogo).getByLabelText('Compra')).toHaveValue('e1')
      expect(within(dialogo).getByText(/Estornos já registrados nesta compra: R\$/)).toBeInTheDocument()
    })

    it('permite escolher outra compra elegível no formulário', async () => {
      getCreditCardInvoice.mockResolvedValue({
        ...FATURA,
        installments: FATURA.installments.map((parcela) => ({ ...parcela, cancelled: false })),
      })
      renderizar()
      fireEvent.click(await screen.findByRole('button', { name: 'Registrar estorno' }))

      const selecao = screen.getByLabelText('Compra')
      fireEvent.change(selecao, { target: { value: 'e2' } })
      expect(selecao).toHaveValue('e2')
    })

    it('valida seleção e valores antes de registrar o estorno', async () => {
      renderizar()
      fireEvent.click(await screen.findByRole('button', { name: 'Registrar estorno' }))

      const confirmar = screen.getByRole('button', { name: 'Confirmar estorno' })
      const valor = screen.getByLabelText('Valor do estorno')
      const selecao = screen.getByLabelText('Compra')

      fireEvent.change(selecao, { target: { value: '' } })
      fireEvent.click(confirmar)
      expect(await screen.findByText('Selecione a compra a estornar.')).toBeInTheDocument()
      expect(screen.getByText('Informe o valor do estorno.')).toBeInTheDocument()

      fireEvent.change(selecao, { target: { value: 'e1' } })
      fireEvent.click(confirmar)
      expect(screen.queryByText('Selecione a compra a estornar.')).not.toBeInTheDocument()

      fireEvent.change(valor, { target: { value: '0' } })
      fireEvent.click(confirmar)
      expect(screen.getByText('O valor do estorno deve ser maior que zero.')).toBeInTheDocument()

      fireEvent.change(valor, { target: { value: '1,001' } })
      fireEvent.click(confirmar)
      expect(screen.getByText('Informe um valor válido com até duas casas decimais.')).toBeInTheDocument()

      expect(registerCreditCardRefund).not.toHaveBeenCalled()
    })

    it('registra estorno parcial com o valor exato, recarrega a fatura e atualiza os estornos', async () => {
      getCreditCardInvoice
        .mockResolvedValueOnce(FATURA)
        .mockResolvedValueOnce({
          ...FATURA,
          installments: FATURA.installments.map((parcela) => parcela.expenseId === 'e1'
            ? { ...parcela, refundedAmount: 100, outstandingAmount: 400 }
            : parcela),
          refunds: [
            ...FATURA.refunds,
            { id: 'est2', expenseId: 'e1', amount: 100, createdAt: '2026-11-18T10:00:00', registeredBy: 'Ana Silva' },
          ],
        })
      renderizar()
      const tabela = await screen.findByTestId('invoice-detail-instalments-tabela')
      fireEvent.click(within(tabela).getByRole('button', { name: 'Estornar' }))

      fireEvent.change(screen.getByLabelText('Valor do estorno'), { target: { value: '100' } })
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar estorno' }))

      await waitFor(() => {
        expect(registerCreditCardRefund).toHaveBeenCalledWith('e1', { amount: 100 })
      })
      expect(await screen.findByText('Estorno registrado.')).toBeInTheDocument()
      await waitFor(() => expect(getCreditCardInvoice).toHaveBeenCalledTimes(2))
      expect(screen.queryByRole('dialog', { name: 'Registrar estorno' })).not.toBeInTheDocument()

      const estornos = await screen.findByTestId('invoice-detail-refunds')
      expect(within(estornos).getByText(textoMoeda(100))).toBeInTheDocument()
      expect(within(estornos).getByText(textoMoeda(200))).toBeInTheDocument()
    })

    it('exibe erro de limite acumulado da API e permite tentar novamente', async () => {
      registerCreditCardRefund
        .mockRejectedValueOnce(new ApiError({
          status: 422,
          erro: 'Estorno inválido',
          messages: ['O valor acumulado dos estornos não pode ultrapassar o valor da compra.'],
        }))
        .mockResolvedValueOnce({
          id: 'est2', expenseId: 'e1', amount: 50, amountAppliedToFutureInstallments: 50,
          amountAppliedToInvoices: 0, pendingCreditAmount: 0, createdAt: '2026-11-18T10:00:00',
        })
      renderizar()
      const tabela = await screen.findByTestId('invoice-detail-instalments-tabela')
      fireEvent.click(within(tabela).getByRole('button', { name: 'Estornar' }))

      const valor = screen.getByLabelText('Valor do estorno')
      const confirmar = screen.getByRole('button', { name: 'Confirmar estorno' })
      fireEvent.change(valor, { target: { value: '250' } })
      fireEvent.click(confirmar)

      expect(await screen.findByRole('alert'))
        .toHaveTextContent('O valor acumulado dos estornos não pode ultrapassar o valor da compra.')

      fireEvent.change(valor, { target: { value: '50' } })
      fireEvent.click(confirmar)

      await waitFor(() => expect(registerCreditCardRefund).toHaveBeenCalledTimes(2))
      expect(await screen.findByText('Estorno registrado.')).toBeInTheDocument()
    })

    it('bloqueia submissões duplicadas enquanto o estorno está em andamento', async () => {
      let resolver
      registerCreditCardRefund.mockImplementation(() => new Promise((resolve) => { resolver = resolve }))
      renderizar()
      const tabela = await screen.findByTestId('invoice-detail-instalments-tabela')
      fireEvent.click(within(tabela).getByRole('button', { name: 'Estornar' }))

      fireEvent.change(screen.getByLabelText('Valor do estorno'), { target: { value: '50' } })
      const confirmar = screen.getByRole('button', { name: 'Confirmar estorno' })
      fireEvent.click(confirmar)
      fireEvent.click(confirmar)

      expect(registerCreditCardRefund).toHaveBeenCalledTimes(1)
      expect(confirmar).toBeDisabled()

      await act(async () => {
        resolver({
          id: 'est2', expenseId: 'e1', amount: 50, amountAppliedToFutureInstallments: 50,
          amountAppliedToInvoices: 0, pendingCreditAmount: 0, createdAt: '2026-11-18T10:00:00',
        })
      })
      expect(await screen.findByText('Estorno registrado.')).toBeInTheDocument()
    })
  })
})
