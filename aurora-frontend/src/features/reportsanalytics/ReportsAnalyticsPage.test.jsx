import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '../../shared/api/errors.js'
import { formatCurrency } from '../../shared/format/currency.js'
import { listMembers } from '../familymanagement/api/listMembers.js'
import { getExpensesByCategory } from './api/getExpensesByCategory.js'
import { getExpensesByMember } from './api/getExpensesByMember.js'
import { getSpendingPatterns } from './api/getSpendingPatterns.js'
import { getCategoryVariations } from './api/getCategoryVariations.js'
import ReportsAnalyticsPage from './ReportsAnalyticsPage.jsx'

vi.mock('./api/getExpensesByCategory.js', () => ({ getExpensesByCategory: vi.fn() }))
vi.mock('./api/getExpensesByMember.js', () => ({ getExpensesByMember: vi.fn() }))
vi.mock('./api/getSpendingPatterns.js', () => ({ getSpendingPatterns: vi.fn() }))
vi.mock('./api/getCategoryVariations.js', () => ({ getCategoryVariations: vi.fn() }))
vi.mock('../familymanagement/api/listMembers.js', () => ({ listMembers: vi.fn() }))

const CATEGORIAS = [
  { category: 'ALIMENTACAO', totalAmount: 450 },
  { category: 'TRANSPORTE', totalAmount: 120.5 },
]

const INTEGRANTES = [
  { memberId: 'u1', memberName: 'Ana Silva', totalAmount: 450 },
  { memberId: 'u2', memberName: 'João Silva', totalAmount: 120.5 },
]

const PADROES = {
  period: '2026-11',
  analysisAvailable: true,
  historyMonthsUsed: 3,
  topCategories: [{
    category: 'ALIMENTACAO',
    currentAmount: 1200,
    historicalAverage: 1000,
    variationPercent: 20,
  }],
}

const VARIACOES = {
  period: '2026-11',
  analysisAvailable: true,
  historyMonthsUsed: 3,
  variations: [{
    category: 'LAZER',
    currentAmount: 650,
    historicalAverage: 500,
    variationPercent: 30,
  }],
}

function textoMoeda(valor) {
  return (_, elemento) => elemento?.textContent === formatCurrency(valor)
}

function renderizar() {
  return render(
    <MemoryRouter>
      <ReportsAnalyticsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getExpensesByCategory.mockResolvedValue(CATEGORIAS)
  getExpensesByMember.mockResolvedValue(INTEGRANTES)
  getSpendingPatterns.mockResolvedValue(PADROES)
  getCategoryVariations.mockResolvedValue(VARIACOES)
  listMembers.mockResolvedValue([
    { id: 'u1', name: 'Ana Silva', role: 'PRINCIPAL', status: 'ATIVO' },
    { id: 'u2', name: 'João Silva', role: 'DEPENDENTE', status: 'ATIVO' },
  ])
})

afterEach(() => {
  cleanup()
})

describe('ReportsAnalyticsPage', () => {
  it('renderiza cabeçalho e filtros previstos no contrato', async () => {
    renderizar()

    expect(screen.getByRole('heading', { level: 1, name: 'Relatórios de gastos' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Trilha de navegação' }))
      .toHaveTextContent('Relatórios de gastos')
    expect(screen.getByLabelText('Período inicial')).toBeInTheDocument()
    expect(screen.getByLabelText('Período final')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoria')).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Ana Silva' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'João Silva' })).toBeInTheDocument()
  })

  it('carrega os dois relatórios na montagem', async () => {
    renderizar()

    expect(await screen.findByTestId('reports-categoria-tabela')).toBeInTheDocument()
    expect(screen.getByTestId('reports-integrante-tabela')).toBeInTheDocument()
    expect(getExpensesByCategory).toHaveBeenCalledTimes(1)
    expect(getExpensesByMember).toHaveBeenCalledTimes(1)
    expect(getExpensesByCategory).toHaveBeenCalledWith({
      startDate: '', endDate: '', category: '', memberId: '',
    })
  })

  it('exibe o relatório por categoria na ordem do backend', async () => {
    renderizar()

    const tabela = await screen.findByTestId('reports-categoria-tabela')
    const linhas = within(tabela).getAllByRole('row').slice(1)
    expect(linhas.map((linha) => linha.textContent)).toEqual([
      'ALIMENTACAO' + formatCurrency(450),
      'TRANSPORTE' + formatCurrency(120.5),
    ])
  })

  it('exibe o relatório por integrante sem mostrar identificadores', async () => {
    renderizar()

    const tabela = await screen.findByTestId('reports-integrante-tabela')
    expect(within(tabela).getByText('Ana Silva')).toBeInTheDocument()
    expect(within(tabela).getByText('João Silva')).toBeInTheDocument()
    expect(within(tabela).queryByText('u1')).not.toBeInTheDocument()
    expect(within(tabela).queryByText('u2')).not.toBeInTheDocument()
  })

  it('formata os valores monetários conforme o padrão do Aurora', async () => {
    renderizar()

    const tabela = await screen.findByTestId('reports-categoria-tabela')
    expect(within(tabela).getByText(textoMoeda(450))).toBeInTheDocument()
    expect(within(tabela).getByText(textoMoeda(120.5))).toBeInTheDocument()
  })

  it('exibe estado vazio sem tratar como erro', async () => {
    getExpensesByCategory.mockResolvedValue([])
    getExpensesByMember.mockResolvedValue([])

    renderizar()

    expect(await screen.findByText('Nenhum gasto encontrado por categoria.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum gasto encontrado por integrante.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('exibe carregamento enquanto as consultas estão em andamento', () => {
    getExpensesByCategory.mockImplementation(() => new Promise(() => {}))
    getExpensesByMember.mockImplementation(() => new Promise(() => {}))

    renderizar()

    expect(screen.getByText('Carregando relatórios...')).toBeInTheDocument()
  })

  it('exibe erro da API e opção de tentar novamente', async () => {
    getExpensesByCategory.mockRejectedValue(new ApiError({
      status: 403,
      erro: 'Acesso negado',
      messages: ['Somente o Principal pode consultar relatórios familiares.'],
    }))

    renderizar()

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Somente o Principal pode consultar relatórios familiares.')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('tenta novamente após erro', async () => {
    getExpensesByCategory
      .mockRejectedValueOnce(new ApiError({
        status: 500,
        erro: 'Erro interno',
        messages: ['Não foi possível carregar os relatórios.'],
      }))
      .mockResolvedValue(CATEGORIAS)

    renderizar()

    expect(await screen.findByText('Não foi possível carregar os relatórios.'))
      .toBeInTheDocument()
    const botao = screen.getByRole('button', { name: 'Tentar novamente' })
    botao.focus()
    expect(document.activeElement).toBe(botao)
    fireEvent.click(botao)

    expect(await screen.findByTestId('reports-categoria-tabela')).toBeInTheDocument()
    await waitFor(() => expect(getExpensesByCategory).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('aplica filtros e envia os parâmetros a ambas as consultas', async () => {
    renderizar()
    await screen.findByTestId('reports-categoria-tabela')

    fireEvent.change(screen.getByLabelText('Período inicial'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('Período final'), { target: { value: '2026-11-30' } })
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'ALIMENTACAO' } })
    fireEvent.change(screen.getByLabelText('Integrante'), { target: { value: 'u2' } })

    const esperado = {
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      category: 'ALIMENTACAO',
      memberId: 'u2',
    }
    await waitFor(() => {
      expect(getExpensesByCategory).toHaveBeenLastCalledWith(esperado)
      expect(getExpensesByMember).toHaveBeenLastCalledWith(esperado)
    })
  })

  it('valida período inválido sem consultar a API', async () => {
    renderizar()
    await screen.findByTestId('reports-categoria-tabela')
    vi.clearAllMocks()

    fireEvent.change(screen.getByLabelText('Período inicial'), { target: { value: '2026-12-01' } })
    fireEvent.change(screen.getByLabelText('Período final'), { target: { value: '2026-11-01' } })

    expect(await screen.findByText('A data inicial não pode ser posterior à data final.'))
      .toBeInTheDocument()
    expect(getExpensesByCategory).not.toHaveBeenCalled()
    expect(getExpensesByMember).not.toHaveBeenCalled()
  })

  it('não envia identificadores de família nem parâmetros indevidos', async () => {
    renderizar()
    await screen.findByTestId('reports-categoria-tabela')

    const payload = getExpensesByCategory.mock.calls[0][0]
    expect(Object.keys(payload).sort()).toEqual(['category', 'endDate', 'memberId', 'startDate'])
    expect(payload).not.toHaveProperty('familyGroupId')
    expect(payload).not.toHaveProperty('userId')
  })

  it('carrega padrões com mês de referência derivado do período e dos filtros', async () => {
    renderizar()

    await screen.findByTestId('reports-padroes-lista')
    expect(getSpendingPatterns).toHaveBeenCalledTimes(1)
    expect(getSpendingPatterns.mock.calls[0][0]).toMatchObject({
      month: expect.stringMatching(/^\d{4}-\d{2}$/),
      category: '',
      memberId: '',
    })

    fireEvent.change(screen.getByLabelText('Período inicial'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'LAZER' } })
    fireEvent.change(screen.getByLabelText('Integrante'), { target: { value: 'u2' } })

    await waitFor(() => {
      expect(getSpendingPatterns).toHaveBeenLastCalledWith({
        month: '2026-10',
        category: 'LAZER',
        memberId: 'u2',
      })
    })
  })

  it('exibe categorias, valores, médias, variações e meses históricos do backend', async () => {
    renderizar()

    const lista = await screen.findByTestId('reports-padroes-lista')
    const item = within(lista).getByRole('listitem')
    expect(within(item).getByText('ALIMENTACAO')).toBeInTheDocument()
    expect(within(item).getByText(textoMoeda(1200))).toBeInTheDocument()
    expect(within(item).getByText(textoMoeda(1000))).toBeInTheDocument()
    expect(within(item).getByText('20%')).toBeInTheDocument()
    expect(screen.getAllByText(/Período 11\/2026 · 3 meses de histórico/)).toHaveLength(2)
  })

  it('informa quando não há histórico suficiente, sem exibir ranking', async () => {
    getSpendingPatterns.mockResolvedValue({
      period: '2026-11',
      analysisAvailable: false,
      historyMonthsUsed: 1,
      topCategories: [],
    })

    renderizar()

    expect(await screen.findByText(
      'São necessários pelo menos 2 meses de histórico para identificar padrões de consumo.',
    )).toBeInTheDocument()
    expect(screen.queryByTestId('reports-padroes-lista')).not.toBeInTheDocument()
  })

  it('preserva todas as categorias empatadas na terceira posição', async () => {
    getSpendingPatterns.mockResolvedValue({
      ...PADROES,
      topCategories: [
        { category: 'A', currentAmount: 100, historicalAverage: 50, variationPercent: 100 },
        { category: 'B', currentAmount: 90, historicalAverage: 50, variationPercent: 80 },
        { category: 'C', currentAmount: 80, historicalAverage: 50, variationPercent: 60 },
        { category: 'D', currentAmount: 80, historicalAverage: 50, variationPercent: 60 },
      ],
    })

    renderizar()

    const lista = await screen.findByTestId('reports-padroes-lista')
    expect(within(lista).getAllByRole('listitem')).toHaveLength(4)
  })

  it('omite a variação quando o backend retorna null', async () => {
    getSpendingPatterns.mockResolvedValue({
      ...PADROES,
      topCategories: [{
        category: 'SEM_HISTORICO', currentAmount: 100, historicalAverage: 0, variationPercent: null,
      }],
    })

    renderizar()

    const lista = await screen.findByTestId('reports-padroes-lista')
    expect(within(lista).queryByText('Variação')).not.toBeInTheDocument()
  })

  it('exibe carregamento da análise de padrões', () => {
    getSpendingPatterns.mockImplementation(() => new Promise(() => {}))

    renderizar()

    expect(screen.getByText('Carregando análise de padrões...')).toBeInTheDocument()
  })

  it('exibe erro da análise e tenta novamente sem prejudicar o RF-015', async () => {
    getSpendingPatterns
      .mockRejectedValueOnce(new ApiError({
        status: 500,
        erro: 'Erro interno',
        messages: ['Não foi possível carregar a análise de padrões.'],
      }))
      .mockResolvedValue(PADROES)

    renderizar()

    expect(await screen.findByText('Não foi possível carregar a análise de padrões.'))
      .toBeInTheDocument()
    expect(screen.getByTestId('reports-categoria-tabela')).toBeInTheDocument()
    expect(screen.getByTestId('reports-integrante-tabela')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByTestId('reports-padroes-lista')).toBeInTheDocument()
    await waitFor(() => expect(getSpendingPatterns).toHaveBeenCalledTimes(2))
  })

  it('usa os valores do backend sem recalcular indicadores no frontend', async () => {
    renderizar()

    const lista = await screen.findByTestId('reports-padroes-lista')
    expect(within(lista).getByText(textoMoeda(1200))).toBeInTheDocument()
    expect(within(lista).getByText(textoMoeda(1000))).toBeInTheDocument()
    expect(within(lista).getByText('20%')).toBeInTheDocument()
    expect(within(lista).queryByText('30%')).not.toBeInTheDocument()
  })

  it('carrega variações com o mesmo mês e filtros das demais seções', async () => {
    renderizar()

    await screen.findByTestId('reports-variacoes-lista')
    expect(getCategoryVariations).toHaveBeenCalledTimes(1)
    expect(getCategoryVariations.mock.calls[0][0]).toMatchObject({
      month: expect.stringMatching(/^\d{4}-\d{2}$/),
      category: '',
      memberId: '',
    })

    fireEvent.change(screen.getByLabelText('Período inicial'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'LAZER' } })
    fireEvent.change(screen.getByLabelText('Integrante'), { target: { value: 'u2' } })

    await waitFor(() => {
      expect(getCategoryVariations).toHaveBeenLastCalledWith({
        month: '2026-10',
        category: 'LAZER',
        memberId: 'u2',
      })
    })
  })

  it('exibe categorias, valores, médias e variações retornadas pelo backend', async () => {
    renderizar()

    const lista = await screen.findByTestId('reports-variacoes-lista')
    const item = within(lista).getByRole('listitem')
    expect(within(item).getByText('LAZER')).toBeInTheDocument()
    expect(within(item).getByText(textoMoeda(650))).toBeInTheDocument()
    expect(within(item).getByText(textoMoeda(500))).toBeInTheDocument()
    expect(within(item).getByText('30%')).toBeInTheDocument()
    expect(screen.getAllByText(/Período 11\/2026 · 3 meses de histórico/)).toHaveLength(2)
  })

  it('não filtra nem calcula o critério de 20% no frontend', async () => {
    getCategoryVariations.mockResolvedValue({
      ...VARIACOES,
      variations: [
        { category: 'ACIMA', currentAmount: 100, historicalAverage: 80, variationPercent: 25 },
        { category: 'ABAIXO', currentAmount: 100, historicalAverage: 90, variationPercent: null },
      ],
    })

    renderizar()

    const lista = await screen.findByTestId('reports-variacoes-lista')
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2)
    expect(within(lista).getByText('ACIMA')).toBeInTheDocument()
    expect(within(lista).getByText('ABAIXO')).toBeInTheDocument()
    expect(within(lista).getByText('25%')).toBeInTheDocument()
    expect(within(lista).getAllByText('Variação')).toHaveLength(1)
  })

  it('omite a variação quando o backend retorna null', async () => {
    getCategoryVariations.mockResolvedValue({
      ...VARIACOES,
      variations: [{
        category: 'SEM_MEDIA', currentAmount: 100, historicalAverage: 0, variationPercent: null,
      }],
    })

    renderizar()

    const lista = await screen.findByTestId('reports-variacoes-lista')
    expect(within(lista).getByText('SEM_MEDIA')).toBeInTheDocument()
    expect(within(lista).queryByText('Variação')).not.toBeInTheDocument()
  })

  it('informa histórico insuficiente sem apresentar variações', async () => {
    getCategoryVariations.mockResolvedValue({
      period: '2026-11',
      analysisAvailable: false,
      historyMonthsUsed: 1,
      variations: [],
    })

    renderizar()

    expect(await screen.findByText(
      'São necessários pelo menos 2 meses de histórico para identificar variações de gastos.',
    )).toBeInTheDocument()
    expect(screen.queryByTestId('reports-variacoes-lista')).not.toBeInTheDocument()
  })

  it('exibe estado vazio quando não há variações relevantes', async () => {
    getCategoryVariations.mockResolvedValue({ ...VARIACOES, variations: [] })

    renderizar()

    expect(await screen.findByText('Nenhuma categoria com aumento superior a 20% neste período.'))
      .toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('exibe carregamento das variações', () => {
    getCategoryVariations.mockImplementation(() => new Promise(() => {}))

    renderizar()

    expect(screen.getByText('Carregando variações de gastos...')).toBeInTheDocument()
  })

  it('trata erro das variações sem afetar RF-015 e RF-016', async () => {
    getCategoryVariations
      .mockRejectedValueOnce(new ApiError({
        status: 500,
        erro: 'Erro interno',
        messages: ['Não foi possível carregar as variações.'],
      }))
      .mockResolvedValue(VARIACOES)

    renderizar()

    expect(await screen.findByText('Não foi possível carregar as variações.')).toBeInTheDocument()
    expect(screen.getByTestId('reports-categoria-tabela')).toBeInTheDocument()
    expect(screen.getByTestId('reports-integrante-tabela')).toBeInTheDocument()
    expect(await screen.findByTestId('reports-padroes-lista')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByTestId('reports-variacoes-lista')).toBeInTheDocument()
    await waitFor(() => expect(getCategoryVariations).toHaveBeenCalledTimes(2))
  })
})
