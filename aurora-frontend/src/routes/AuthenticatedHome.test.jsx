import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

vi.mock('../features/auth/api/logout.js', () => ({ logout: vi.fn() }))
vi.mock('../features/financialoverview/api/getFinancialOverview.js', () => ({
  getFinancialOverview: vi.fn(() => Promise.resolve({
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
  })),
}))

vi.mock('../features/payablebills/api/listPayableBills.js', () => ({
  listPayableBills: vi.fn(() => Promise.resolve({ bills: [] })),
}))
vi.mock('../features/expenses/api/listExpenses.js', () => ({
  listExpenses: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../features/financialgoals/api/getSavingsSuggestion.js', () => ({
  getSavingsSuggestion: vi.fn(() => Promise.resolve(null)),
}))
vi.mock('../features/financialgoals/api/listGoals.js', () => ({
  listGoals: vi.fn(() => Promise.resolve([])),
}))

import { logout } from '../features/auth/api/logout.js'
import { getFinancialOverview } from '../features/financialoverview/api/getFinancialOverview.js'
import { listPayableBills } from '../features/payablebills/api/listPayableBills.js'
import { listExpenses } from '../features/expenses/api/listExpenses.js'
import { getSavingsSuggestion } from '../features/financialgoals/api/getSavingsSuggestion.js'
import { listGoals } from '../features/financialgoals/api/listGoals.js'
import { AuthProvider } from '../shared/auth/AuthContext.jsx'
import AuthenticatedHome from './AuthenticatedHome.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

const SESSION_KEY = 'aurora.session'
const MENSAGEM_HOME = 'Autenticação realizada. Você está na sua conta Aurora.'

const LINKS_PRINCIPAL = [
  ['Visão geral', '/'],
  ['Contas a pagar', '/payable-bills'],
  ['Contas a receber', '/receivables'],
  ['Gastos da família', '/expenses'],
  ['Lançar gasto', '/expenses/new'],
  ['Cartões e faturas', '/credit-cards'],
  ['Família', '/family'],
  ['Visão financeira', '/financial-overview'],
  ['Alertas', '/notifications'],
  ['Relatórios e análises', '/reports-analytics'],
  ['Metas financeiras', '/financial-goals'],
]

const LINKS_DEPENDENTE = [
  ['Visão geral', '/'],
  ['Meus gastos', '/expenses'],
  ['Lançar gasto', '/expenses/new'],
]

function sessaoValida(role = 'PRINCIPAL') {
  return JSON.stringify({
    accessToken: 'jwt-de-teste',
    tokenType: 'Bearer',
    expiresIn: 3600,
    expiresAt: Date.now() + 3_600_000,
    userId: 'user-1',
    familyGroupId: 'family-1',
    name: 'Ana Silva',
    email: 'ana@example.com',
    role,
  })
}

function Localizacao() {
  const location = useLocation()
  return <span data-testid="caminho">{location.pathname}</span>
}

function renderizarHome({ role = 'PRINCIPAL', path = '/' } = {}) {
  sessionStorage.setItem(SESSION_KEY, sessaoValida(role))

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Localizacao />
        <Routes>
          <Route path="/" element={<AuthenticatedHome />} />
          <Route path="/login" element={<p>Tela de login</p>} />
          <Route path="*" element={<p>Destino da navegação</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function renderizarHomeEmCaminho(path, role = 'PRINCIPAL') {
  sessionStorage.setItem(SESSION_KEY, sessaoValida(role))

  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AuthenticatedHome />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  logout.mockResolvedValue(null)
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe('Home autenticada', () => {
  it('renderiza a home para o Principal com saudação e identificação', () => {
    renderizarHome()

    expect(screen.getByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
    expect(screen.getByText('Olá, Ana Silva!')).toBeInTheDocument()
    expect(screen.getByText(MENSAGEM_HOME)).toBeInTheDocument()
    expect(screen.getByText('Responsável')).toBeInTheDocument()
    expect(screen.getAllByText('Ana Silva').length).toBeGreaterThan(0)
    expect(screen.getAllByText('AS').length).toBeGreaterThan(0)
    expect(screen.getByRole('time')).toHaveTextContent(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  it('renderiza a home para o Dependente com o perfil correto', () => {
    renderizarHome({ role: 'DEPENDENTE' })

    expect(screen.getByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
    expect(screen.getByText('Olá, Ana Silva!')).toBeInTheDocument()
    expect(screen.getByText('Dependente')).toBeInTheDocument()
    expect(screen.queryByText('Responsável')).not.toBeInTheDocument()
  })

  it('exibe os links permitidos ao Principal com as rotas existentes', () => {
    renderizarHome()

    const navegacao = screen.getByRole('navigation', { name: 'Navegação principal' })
    for (const [nome, rota] of LINKS_PRINCIPAL) {
      expect(within(navegacao).getByRole('link', { name: nome })).toHaveAttribute('href', rota)
    }
  })

  it('exibe apenas os links permitidos ao Dependente', () => {
    renderizarHome({ role: 'DEPENDENTE' })

    const navegacao = screen.getByRole('navigation', { name: 'Navegação principal' })
    const nomes = within(navegacao).getAllByRole('link').map((link) => link.textContent)

    expect(nomes).toEqual(LINKS_DEPENDENTE.map(([nome]) => nome))
    for (const [nome, rota] of LINKS_DEPENDENTE) {
      expect(within(navegacao).getByRole('link', { name: nome })).toHaveAttribute('href', rota)
    }
  })

  it('não exibe links exclusivos do Principal para o Dependente', () => {
    renderizarHome({ role: 'DEPENDENTE' })

    const compartilhados = ['Visão geral', 'Lançar gasto', 'Família']
    const exclusivos = LINKS_PRINCIPAL.filter(([nome]) => !compartilhados.includes(nome))
    for (const [nome] of exclusivos) {
      expect(screen.queryByRole('link', { name: nome })).not.toBeInTheDocument()
    }
  })

  it('navega para a rota correta ao clicar nos links', () => {
    renderizarHome()

    fireEvent.click(screen.getByRole('link', { name: 'Contas a pagar' }))
    expect(screen.getByTestId('caminho')).toHaveTextContent('/payable-bills')
  })

  it('permite que o Principal acesse o lançamento de gasto a partir da Home', () => {
    renderizarHome()

    const link = screen.getByRole('link', { name: 'Lançar gasto' })
    expect(link).toHaveAttribute('href', '/expenses/new')

    fireEvent.click(link)
    expect(screen.getByTestId('caminho')).toHaveTextContent('/expenses/new')
  })

  it('navega para a rota de gastos do Dependente', () => {
    renderizarHome({ role: 'DEPENDENTE' })

    fireEvent.click(screen.getByRole('link', { name: 'Meus gastos' }))
    expect(screen.getByTestId('caminho')).toHaveTextContent('/expenses')
  })

  it('permite que o Dependente acesse o lançamento de gasto a partir da Home', () => {
    renderizarHome({ role: 'DEPENDENTE' })

    const link = screen.getByRole('link', { name: 'Lançar gasto' })
    expect(link).toHaveAttribute('href', '/expenses/new')

    fireEvent.click(link)
    expect(screen.getByTestId('caminho')).toHaveTextContent('/expenses/new')
  })

  it('indica a rota ativa na navegação', () => {
    renderizarHomeEmCaminho('/payable-bills')

    expect(screen.getByRole('link', { name: 'Contas a pagar' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current', 'page')
  })

  it('indica a visão geral como ativa na rota inicial', () => {
    renderizarHomeEmCaminho('/')

    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Contas a pagar' })).not.toHaveAttribute('aria-current', 'page')
  })

  it('integra a ação de sair ao logout existente', async () => {
    renderizarHome()

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/login'))
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('redireciona usuário não autenticado para o login', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Localizacao />
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AuthenticatedHome />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<p>Tela de login</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument()
  })

  it('monta os blocos financeiros apenas para o Principal', async () => {
    renderizarHome()

    expect(await screen.findByRole('region', { name: 'De olho nas contas' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Últimos gastos da família' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Sugestão de economia' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Metas cadastradas' })).toBeInTheDocument()
    expect(listPayableBills).toHaveBeenCalledTimes(1)
    expect(listExpenses).toHaveBeenCalledTimes(1)
    expect(getSavingsSuggestion).toHaveBeenCalledTimes(1)
    expect(listGoals).toHaveBeenCalledTimes(1)
  })

  it('não exibe blocos nem consulta APIs restritas para o Dependente', () => {
    renderizarHome({ role: 'DEPENDENTE' })

    expect(getFinancialOverview).not.toHaveBeenCalled()
    expect(listPayableBills).not.toHaveBeenCalled()
    expect(listExpenses).not.toHaveBeenCalled()
    expect(getSavingsSuggestion).not.toHaveBeenCalled()
    expect(listGoals).not.toHaveBeenCalled()
    expect(screen.queryByText(/saldo previsto|entradas previstas|saídas previstas|comprometimento da renda/i))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Filtro de período' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'De olho nas contas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Últimos gastos da família' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Sugestão de economia' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Metas cadastradas' })).not.toBeInTheDocument()
  })

  it('não exibe os blocos ainda não implementados da Home', () => {
    renderizarHome()

    expect(screen.queryByText(/próximas do vencimento|resumo de metas|percentual de progresso/i))
      .not.toBeInTheDocument()
  })

  it('oferece menu recolhível para mobile sem esconder o conteúdo da Home', async () => {
    renderizarHome()

    const botao = screen.getByRole('button', { name: 'Abrir menu' })
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()

    fireEvent.click(botao)
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('home-menu')).toHaveClass('home__nav--aberto')

    fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }))
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('home-menu')).not.toHaveClass('home__nav--aberto')
  })

  it('mantém o menu recolhível funcional para o Dependente', () => {
    renderizarHome({ role: 'DEPENDENTE' })

    const botao = screen.getByRole('button', { name: 'Abrir menu' })
    fireEvent.click(botao)
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meus gastos' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Visão financeira' })).not.toBeInTheDocument()
  })
})
