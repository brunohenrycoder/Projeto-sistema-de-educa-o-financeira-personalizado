import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../shared/api/errors.js'
import { getFinancialOverview } from '../financialoverview/api/getFinancialOverview.js'
import HomeFinancialSection from './HomeFinancialSection.jsx'

vi.mock('../financialoverview/api/getFinancialOverview.js', () => ({
  getFinancialOverview: vi.fn(),
}))

function mesAtual() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

const RESUMO = {
  period: '2026-11',
  realizedIncome: 5000,
  plannedIncome: 500,
  realizedExpenses: 1800,
  plannedExpenses: 1200,
  projectedBalance: 2000,
  incomeConsidered: 5000,
  expensesConsidered: 3000,
  commitmentPercent: 60,
  alertThresholdPercent: 80,
  thresholdReached: false,
  alert: null,
}

function resumoCom(alteracoes) {
  return { ...RESUMO, ...alteracoes }
}

function renderizar() {
  return render(
    <MemoryRouter>
      <HomeFinancialSection />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getFinancialOverview.mockResolvedValue(RESUMO)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Blocos financeiros da Home', () => {
  it('carrega o resumo do mês atual ao montar', async () => {
    renderizar()

    await waitFor(() => {
      expect(getFinancialOverview).toHaveBeenCalledWith({ month: mesAtual() })
    })
    expect(await screen.findByText('Período: 11/2026')).toBeInTheDocument()
  })

  it('mantém o rótulo de período separado dos botões do filtro', async () => {
    renderizar()

    const rotulo = await screen.findByText('Período: 11/2026')
    expect(rotulo).toHaveClass('home-finance__period-label')
    expect(rotulo).not.toHaveClass('home-finance__period')
    expect(screen.getByRole('button', { name: 'Este mês' })).toHaveClass('home-finance__period')
  })

  it('exibe saldo previsto, entradas previstas e saídas previstas sem recalcular', async () => {
    renderizar()

    expect(await screen.findByText(/2\.000,00/)).toBeInTheDocument()
    expect(screen.getByText(/500,00/)).toBeInTheDocument()
    expect(screen.getByText(/1\.200,00/)).toBeInTheDocument()
    expect(screen.getByText('Resumo financeiro')).toBeInTheDocument()
  })

  it('alterna para o mês anterior usando o parâmetro month', async () => {
    renderizar()
    await screen.findByText('Período: 11/2026')

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))

    const [ano, mes] = mesAtual().split('-').map(Number)
    const anterior = new Date(ano, mes - 2, 1)
    const esperado = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}`
    await waitFor(() => {
      expect(getFinancialOverview).toHaveBeenLastCalledWith({ month: esperado })
    })
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('aplica a virada do ano ao selecionar o mês anterior', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 15, 12))
    renderizar()

    await act(async () => { vi.runAllTimers() })
    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await act(async () => { vi.runAllTimers() })

    expect(getFinancialOverview).toHaveBeenLastCalledWith({ month: '2025-12' })
  })

  it('não oferece filtro semanal nem períodos adicionais', () => {
    renderizar()

    expect(screen.queryByRole('button', { name: /semana/i })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Filtro de período' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /mês/i })).toHaveLength(2)
  })

  it('exibe o alerta quando thresholdReached é true', async () => {
    getFinancialOverview.mockResolvedValue(resumoCom({
      commitmentPercent: 85,
      thresholdReached: true,
      alert: {
        id: 'a1',
        referenceMonth: '2026-11',
        thresholdPercent: 80,
        commitmentPercent: 85,
        createdAt: '2026-11-18T08:00:00',
      },
    }))
    renderizar()

    expect(await screen.findByRole('alert', { name: 'Alerta de comprometimento da renda' })).toBeInTheDocument()
    expect(screen.getByText(/Comprometimento da renda: 85%/)).toBeInTheDocument()
    expect(screen.getByText(/Limite de 80% atingido/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver alertas' })).toHaveAttribute('href', '/notifications')
  })

  it('exibe o alerta com thresholdReached true mesmo quando alert é null', async () => {
    getFinancialOverview.mockResolvedValue(resumoCom({
      commitmentPercent: 90,
      thresholdReached: true,
      alert: null,
    }))
    renderizar()

    expect(await screen.findByRole('alert', { name: 'Alerta de comprometimento da renda' })).toBeInTheDocument()
    expect(screen.getByText(/Limite de 80% atingido/)).toBeInTheDocument()
    expect(screen.queryByText(/Registrado em/)).not.toBeInTheDocument()
  })

  it('não exibe alerta quando thresholdReached é false', async () => {
    renderizar()

    await screen.findByText('Período: 11/2026')
    expect(screen.queryByRole('alert', { name: 'Alerta de comprometimento da renda' })).not.toBeInTheDocument()
  })

  it('oculta o indicador quando commitmentPercent é null', async () => {
    getFinancialOverview.mockResolvedValue(resumoCom({ commitmentPercent: null, thresholdReached: false }))
    renderizar()

    await screen.findByText('Período: 11/2026')
    expect(screen.queryByText(/Comprometimento da renda/)).not.toBeInTheDocument()
  })

  it('exibe o estado vazio quando não há movimentações reais nem previstas', async () => {
    getFinancialOverview.mockResolvedValue(resumoCom({
      realizedIncome: 0,
      plannedIncome: 0,
      realizedExpenses: 0,
      plannedExpenses: 0,
      projectedBalance: 0,
      commitmentPercent: null,
    }))
    renderizar()

    expect(await screen.findByText(/Nenhuma movimentação financeira encontrada/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Resumo financeiro' })).not.toBeInTheDocument()
  })

  it('não trata como vazio quando há movimentações realizadas', async () => {
    getFinancialOverview.mockResolvedValue(resumoCom({
      plannedIncome: 0,
      plannedExpenses: 0,
      projectedBalance: 0,
      commitmentPercent: null,
    }))
    renderizar()

    expect(await screen.findByRole('region', { name: 'Resumo financeiro' })).toBeInTheDocument()
    expect(screen.queryByText(/Nenhuma movimentação financeira encontrada/)).not.toBeInTheDocument()
  })

  it('exibe mensagens de erro e permite tentar novamente', async () => {
    getFinancialOverview
      .mockRejectedValueOnce(new ApiError({
        status: 500,
        erro: 'Erro interno',
        messages: ['Não foi possível carregar a visão financeira.'],
        caminho: '/api/financial-overview',
      }))
      .mockResolvedValueOnce(RESUMO)
    renderizar()

    expect(await screen.findByText('Não foi possível carregar a visão financeira.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText(/2\.000,00/)).toBeInTheDocument()
    expect(getFinancialOverview).toHaveBeenCalledTimes(2)
  })

  it('descarta respostas obsoletas ao trocar de período', async () => {
    let resolverAtual
    let resolverAnterior
    const respostaAtual = new Promise((resolve) => { resolverAtual = resolve })
    const respostaAnterior = new Promise((resolve) => { resolverAnterior = resolve })

    getFinancialOverview
      .mockReturnValueOnce(respostaAtual)
      .mockReturnValueOnce(respostaAnterior)

    renderizar()
    await waitFor(() => expect(getFinancialOverview).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() => expect(getFinancialOverview).toHaveBeenCalledTimes(2))

    await act(async () => { resolverAnterior(resumoCom({ projectedBalance: 333 })) })
    expect(await screen.findByText(/333,00/)).toBeInTheDocument()

    await act(async () => { resolverAtual(resumoCom({ projectedBalance: 999 })) })
    expect(screen.getByText(/333,00/)).toBeInTheDocument()
    expect(screen.queryByText(/999,00/)).not.toBeInTheDocument()
  })
})
