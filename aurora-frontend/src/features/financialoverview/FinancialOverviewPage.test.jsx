import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/errors.js'
import { AuthProvider } from '../../shared/auth/AuthContext.jsx'
import { formatCurrency } from '../../shared/format/currency.js'
import { getFinancialOverview } from './api/getFinancialOverview.js'
import FinancialOverviewPage from './FinancialOverviewPage.jsx'

vi.mock('./api/getFinancialOverview.js', () => ({ getFinancialOverview: vi.fn() }))

const SESSION_KEY = 'aurora.session'

const RESUMO = {
  period: '2026-11',
  realizedIncome: 5000,
  plannedIncome: 1000,
  realizedExpenses: 1800,
  plannedExpenses: 1200,
  projectedBalance: 2000,
  incomeConsidered: 6000,
  expensesConsidered: 3000,
  commitmentPercent: 50,
  alertThresholdPercent: 80,
  thresholdReached: false,
  alert: null,
}

function textoMoeda(valor) {
  return (_, elemento) => elemento?.textContent === formatCurrency(valor)
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
    <MemoryRouter initialEntries={['/financial-overview']}>
      <AuthProvider>
        <FinancialOverviewPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getFinancialOverview.mockResolvedValue(RESUMO)
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe('FinancialOverviewPage', () => {
  it('exibe o resumo financeiro com os valores retornados pelo backend', async () => {
    renderizar()

    expect(await screen.findByText('Período: 11/2026')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Visão financeira' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resumo financeiro' })).toBeInTheDocument()

    expect(screen.getByText('Entradas realizadas')).toBeInTheDocument()
    expect(screen.getByText(textoMoeda(5000))).toBeInTheDocument()
    expect(screen.getByText('Entradas previstas')).toBeInTheDocument()
    expect(screen.getByText(textoMoeda(1000))).toBeInTheDocument()
    expect(screen.getByText('Saídas realizadas')).toBeInTheDocument()
    expect(screen.getByText(textoMoeda(1800))).toBeInTheDocument()
    expect(screen.getByText('Saídas previstas')).toBeInTheDocument()
    expect(screen.getByText(textoMoeda(1200))).toBeInTheDocument()
    expect(screen.getByText('Saldo projetado')).toBeInTheDocument()
    expect(screen.getByText(textoMoeda(2000))).toBeInTheDocument()

    expect(screen.getByText('Renda considerada')).toBeInTheDocument()
    expect(screen.getByText(textoMoeda(6000))).toBeInTheDocument()
    expect(screen.getByText('Despesas consideradas')).toBeInTheDocument()
    expect(screen.getByText(textoMoeda(3000))).toBeInTheDocument()

    expect(getFinancialOverview).toHaveBeenCalledTimes(1)
    expect(getFinancialOverview).toHaveBeenCalledWith({
      month: expect.stringMatching(/^\d{4}-\d{2}$/),
    })
  })

  it('recarrega o resumo ao selecionar outro mês', async () => {
    const setembro = {
      ...RESUMO,
      period: '2026-09',
      realizedIncome: 100,
      plannedIncome: 200,
      realizedExpenses: 300,
      plannedExpenses: 400,
      projectedBalance: -400,
    }
    getFinancialOverview
      .mockResolvedValueOnce(RESUMO)
      .mockResolvedValueOnce(setembro)

    renderizar()
    expect(await screen.findByText('Período: 11/2026')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/mês de referência/i), {
      target: { value: '2026-09' },
    })

    await waitFor(() => {
      expect(getFinancialOverview).toHaveBeenCalledWith({ month: '2026-09' })
    })
    expect(await screen.findByText('Período: 09/2026')).toBeInTheDocument()
    expect(screen.getByText(textoMoeda(100))).toBeInTheDocument()
  })

  it('exibe estado de carregamento enquanto consulta', async () => {
    let resolver
    getFinancialOverview.mockReturnValue(new Promise((resolve) => {
      resolver = resolve
    }))

    renderizar()

    expect(screen.getByText(/carregando visão financeira/i)).toBeInTheDocument()

    await act(async () => {
      resolver(RESUMO)
    })
  })

  it('exibe as mensagens de erro do backend', async () => {
    getFinancialOverview.mockRejectedValue(new ApiError({
      status: 403,
      erro: 'Acesso negado',
      messages: ['Somente o Principal pode consultar a visão financeira.'],
    }))

    renderizar()

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Somente o Principal pode consultar a visão financeira.')
  })

  it('permite tentar novamente após um erro', async () => {
    getFinancialOverview
      .mockRejectedValueOnce(new ApiError({
        status: 503,
        erro: 'Indisponível',
        messages: ['Tente novamente mais tarde.'],
      }))
      .mockResolvedValueOnce(RESUMO)

    renderizar()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Tente novamente mais tarde.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByText('Período: 11/2026')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(() => expect(getFinancialOverview).toHaveBeenCalledTimes(2))
  })

  it('exibe mensagem de ausência de movimentações quando todos os valores são zero', async () => {
    getFinancialOverview.mockResolvedValue({
      ...RESUMO,
      realizedIncome: 0,
      plannedIncome: 0,
      realizedExpenses: 0,
      plannedExpenses: 0,
      projectedBalance: 0,
      commitmentPercent: null,
      alert: null,
    })

    renderizar()

    expect(
      await screen.findByText(/nenhuma movimentação financeira encontrada/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Saldo projetado')).not.toBeInTheDocument()
    expect(screen.queryByText('Entradas realizadas')).not.toBeInTheDocument()
  })

  it('exibe o percentual abaixo do limite sem alerta', async () => {
    renderizar()

    expect(await screen.findByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Comprometimento da renda')).toBeInTheDocument()
    expect(screen.getByText('Dentro do limite de 80%'))
      .toHaveAttribute('data-threshold-reached', 'false')
    expect(screen.queryByText('Alerta financeiro')).not.toBeInTheDocument()
  })

  it('exibe o indicador de limite atingido em 80% sem alerta persistido', async () => {
    getFinancialOverview.mockResolvedValue({
      ...RESUMO,
      commitmentPercent: 80,
      thresholdReached: true,
      alert: null,
    })

    renderizar()

    expect(await screen.findByText('80%')).toBeInTheDocument()
    expect(screen.getByText('Limite de 80% atingido'))
      .toHaveAttribute('data-threshold-reached', 'true')
    expect(screen.queryByText('Alerta financeiro')).not.toBeInTheDocument()
  })

  it('exibe o alerta persistido quando o comprometimento ultrapassa 80%', async () => {
    getFinancialOverview.mockResolvedValue({
      ...RESUMO,
      commitmentPercent: 95.5,
      thresholdReached: true,
      alert: {
        id: 'a1',
        referenceMonth: '2026-11',
        thresholdPercent: 80,
        commitmentPercent: 95.5,
        createdAt: '2026-11-05T10:00:00',
      },
    })

    renderizar()

    expect(await screen.findByText('95,5%')).toBeInTheDocument()
    expect(screen.getByText('Limite de 80% atingido'))
      .toHaveAttribute('data-threshold-reached', 'true')

    const alerta = screen.getByRole('region', { name: 'Alerta financeiro' })
    expect(alerta).toBeInTheDocument()
    expect(within(alerta).getByText('O comprometimento da renda atingiu 95,5%.')).toBeInTheDocument()
    expect(within(alerta).getByText('11/2026')).toBeInTheDocument()
    expect(within(alerta).getByText('80%')).toBeInTheDocument()
    expect(within(alerta).getByText('05/11/2026 10:00')).toBeInTheDocument()
  })

  it('não exibe percentual nem alerta quando a renda considerada é zero', async () => {
    getFinancialOverview.mockResolvedValue({
      ...RESUMO,
      realizedIncome: 0,
      plannedIncome: 0,
      incomeConsidered: 0,
      expensesConsidered: 3000,
      commitmentPercent: null,
      thresholdReached: false,
      alert: null,
    })

    renderizar()

    const comparacao = await screen.findByRole('region', {
      name: 'Renda e despesas consideradas',
    })
    expect(within(comparacao).getByText('Renda considerada')).toBeInTheDocument()
    expect(within(comparacao).getByText(textoMoeda(0))).toBeInTheDocument()
    expect(within(comparacao).getByText('Despesas consideradas')).toBeInTheDocument()
    expect(within(comparacao).getByText(textoMoeda(3000))).toBeInTheDocument()
    expect(screen.queryByText('Comprometimento da renda')).not.toBeInTheDocument()
    expect(screen.queryByText('Alerta financeiro')).not.toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })
})
