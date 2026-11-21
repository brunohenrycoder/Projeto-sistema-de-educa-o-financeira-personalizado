import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom'
import { AuthProvider } from '../shared/auth/AuthContext.jsx'
import { request } from '../shared/api/client.js'
import { listNotifications } from '../features/notifications/api/listNotifications.js'
import { getExpensesByCategory } from '../features/reportsanalytics/api/getExpensesByCategory.js'
import { getExpensesByMember } from '../features/reportsanalytics/api/getExpensesByMember.js'
import { getSpendingPatterns } from '../features/reportsanalytics/api/getSpendingPatterns.js'
import { getCategoryVariations } from '../features/reportsanalytics/api/getCategoryVariations.js'
import { getSavingsSuggestion } from '../features/financialgoals/api/getSavingsSuggestion.js'
import { confirmGoal } from '../features/financialgoals/api/confirmGoal.js'
import { listGoals } from '../features/financialgoals/api/listGoals.js'
import AppRoutes from './AppRoutes.jsx'

vi.mock('../features/expenses/api/listExpenses.js', () => ({
  listExpenses: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../features/familymanagement/api/listMembers.js', () => ({
  listMembers: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../features/payablebills/api/listPayableBills.js', () => ({
  listPayableBills: vi.fn(() => Promise.resolve({ bills: [] })),
}))
vi.mock('../features/receivables/api/listReceivables.js', () => ({
  listReceivables: vi.fn(() => Promise.resolve({ receivables: [] })),
}))
vi.mock('../features/creditcards/api/listCreditCards.js', () => ({
  listCreditCards: vi.fn(() => Promise.resolve({ cards: [] })),
}))
vi.mock('../features/creditcards/api/listCreditCardInvoices.js', () => ({
  listCreditCardInvoices: vi.fn(() => Promise.resolve({ invoices: [] })),
}))
vi.mock('../features/creditcards/api/getCreditCardInvoice.js', () => ({
  getCreditCardInvoice: vi.fn(() => Promise.resolve(null)),
}))
vi.mock('../features/notifications/api/listNotifications.js', () => ({
  listNotifications: vi.fn(() => Promise.resolve({ notifications: [] })),
}))
vi.mock('../features/reportsanalytics/api/getExpensesByCategory.js', () => ({
  getExpensesByCategory: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../features/reportsanalytics/api/getExpensesByMember.js', () => ({
  getExpensesByMember: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../features/reportsanalytics/api/getSpendingPatterns.js', () => ({
  getSpendingPatterns: vi.fn(() => Promise.resolve({
    period: '2026-11',
    analysisAvailable: false,
    historyMonthsUsed: 0,
    topCategories: [],
  })),
}))
vi.mock('../features/reportsanalytics/api/getCategoryVariations.js', () => ({
  getCategoryVariations: vi.fn(() => Promise.resolve({
    period: '2026-11',
    analysisAvailable: false,
    historyMonthsUsed: 0,
    variations: [],
  })),
}))
vi.mock('../features/financialgoals/api/getSavingsSuggestion.js', () => ({
  getSavingsSuggestion: vi.fn(() => Promise.resolve(null)),
}))
vi.mock('../features/financialgoals/api/confirmGoal.js', () => ({
  confirmGoal: vi.fn(() => Promise.resolve(null)),
}))
vi.mock('../features/financialgoals/api/listGoals.js', () => ({
  listGoals: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../features/financialoverview/api/getFinancialOverview.js', () => ({
  getFinancialOverview: vi.fn(() => Promise.resolve({
    period: '2026-11',
    realizedIncome: 0,
    plannedIncome: 0,
    realizedExpenses: 0,
    plannedExpenses: 0,
    projectedBalance: 0,
    incomeConsidered: 0,
    expensesConsidered: 0,
    commitmentPercent: null,
    alertThresholdPercent: 80,
    thresholdReached: false,
    alert: null,
  })),
}))

const SESSION_KEY = 'aurora.session'

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
  const navigationType = useNavigationType()

  return (
    <div>
      <span data-testid="caminho">{location.pathname}</span>
      <span data-testid="tipo-navegacao">{navigationType}</span>
    </div>
  )
}

function expectNenhumaConsultaRelatorios() {
  expect(getExpensesByCategory).not.toHaveBeenCalled()
  expect(getExpensesByMember).not.toHaveBeenCalled()
  expect(getSpendingPatterns).not.toHaveBeenCalled()
  expect(getCategoryVariations).not.toHaveBeenCalled()
}

function expectNenhumaConsultaMetas() {
  expect(getSavingsSuggestion).not.toHaveBeenCalled()
  expect(confirmGoal).not.toHaveBeenCalled()
  expect(listGoals).not.toHaveBeenCalled()
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('AppRoutes', () => {
  it('limpa a sessão e redireciona com replace após 401 fora do login', async () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      accessToken: 'jwt-de-teste',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: Date.now() + 3_600_000,
      userId: 'user-1',
      familyGroupId: 'family-1',
      name: 'Ana Silva',
      email: 'ana@example.com',
      role: 'PRINCIPAL',
    }))

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: vi.fn().mockResolvedValue(JSON.stringify({ mensagens: ['Credenciais inválidas'] })),
    }))

    await act(async () => {
      await expect(request('/financial-overview')).rejects.toBeTruthy()
    })

    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
    expect(screen.getByTestId('tipo-navegacao')).toHaveTextContent('REPLACE')
  })

  it('mantém as rotas estruturais sem redirecionamento', () => {
    const caminhos = ['/register', '/login', '/confirm-email']

    for (const caminho of caminhos) {
      render(
        <MemoryRouter initialEntries={[caminho]}>
          <AuthProvider>
            <Localizacao />
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('caminho')).toHaveTextContent(caminho)
      cleanup()
    }
  })

  it('redireciona para login ao acessar a rota protegida sem sessão', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('mantém a rota protegida acessível com sessão válida', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      accessToken: 'jwt-de-teste',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: Date.now() + 3_600_000,
      userId: 'user-1',
      familyGroupId: 'family-1',
      name: 'Ana Silva',
      email: 'ana@example.com',
      role: 'PRINCIPAL',
    }))

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
  })

  it('permite que Principal autenticado acesse /family', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/family']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/family')
    expect(screen.getByRole('heading', { name: 'Gerenciamento familiar' })).toBeInTheDocument()
  })

  it('redireciona Dependente autenticado de /family para a rota inicial', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/family']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
    expect(screen.queryByRole('heading', { name: 'Gerenciamento familiar' })).not.toBeInTheDocument()
  })

  it('redireciona usuário não autenticado de /family para o login', () => {
    render(
      <MemoryRouter initialEntries={['/family']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('permite que Principal autenticado acesse /expenses', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/expenses')
    expect(screen.getByRole('heading', { name: 'Cada gasto, uma visão mais clara.' }))
      .toBeInTheDocument()
  })

  it('permite que Dependente autenticado acesse /expenses', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/expenses')
    expect(screen.getByRole('heading', { name: 'Cada gasto, uma visão mais clara.' }))
      .toBeInTheDocument()
  })

  it('redireciona usuário não autenticado de /expenses para o login', () => {
    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('permite que Principal autenticado acesse /expenses/new', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/expenses/new']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/expenses/new')
    expect(screen.getByRole('heading', { name: 'Registrar despesa' })).toBeInTheDocument()
  })

  it('permite que Dependente autenticado acesse /expenses/new', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/expenses/new']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/expenses/new')
    expect(screen.getByRole('heading', { name: 'Registrar despesa' })).toBeInTheDocument()
  })

  it('redireciona usuário não autenticado de /expenses/new para o login', () => {
    render(
      <MemoryRouter initialEntries={['/expenses/new']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('permite que Principal autenticado acesse /payable-bills', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/payable-bills']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/payable-bills')
    expect(screen.getByRole('heading', { name: 'Contas a pagar' })).toBeInTheDocument()
  })

  it('redireciona Dependente autenticado de /payable-bills para a rota inicial', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/payable-bills']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
    expect(screen.queryByRole('heading', { name: 'Contas a pagar' })).not.toBeInTheDocument()
  })

  it('redireciona usuário não autenticado de /payable-bills para o login', () => {
    render(
      <MemoryRouter initialEntries={['/payable-bills']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('permite que Principal autenticado acesse /payable-bills/new', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/payable-bills/new']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/payable-bills/new')
    expect(screen.getByRole('heading', { name: 'Cadastrar conta a pagar' })).toBeInTheDocument()
  })

  it('redireciona Dependente autenticado de /payable-bills/new para a rota inicial', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/payable-bills/new']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
    expect(screen.queryByRole('heading', { name: 'Cadastrar conta a pagar' })).not.toBeInTheDocument()
  })

  it('redireciona usuário não autenticado de /payable-bills/new para o login', () => {
    render(
      <MemoryRouter initialEntries={['/payable-bills/new']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('permite que Principal autenticado acesse /receivables', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/receivables']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/receivables')
    expect(screen.getByRole('heading', { name: 'Contas a receber' })).toBeInTheDocument()
  })

  it('redireciona Dependente autenticado de /receivables para a rota inicial', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/receivables']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
    expect(screen.queryByRole('heading', { name: 'Contas a receber' })).not.toBeInTheDocument()
  })

  it('redireciona usuário não autenticado de /receivables para o login', () => {
    render(
      <MemoryRouter initialEntries={['/receivables']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('permite que Principal autenticado acesse /receivables/new', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/receivables/new']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/receivables/new')
    expect(screen.getByRole('heading', { name: 'Cadastrar recebimento' })).toBeInTheDocument()
  })

  it('redireciona Dependente autenticado de /receivables/new para a rota inicial', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/receivables/new']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
    expect(screen.queryByRole('heading', { name: 'Cadastrar recebimento' })).not.toBeInTheDocument()
  })

  it('redireciona usuário não autenticado de /receivables/new para o login', () => {
    render(
      <MemoryRouter initialEntries={['/receivables/new']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('permite que Principal autenticado acesse /financial-overview', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/financial-overview']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/financial-overview')
  })

  it('redireciona Dependente autenticado de /financial-overview para a rota inicial', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/financial-overview']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
  })

  it('redireciona usuário não autenticado de /financial-overview para o login', () => {
    render(
      <MemoryRouter initialEntries={['/financial-overview']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('permite que Principal autenticado acesse /credit-cards', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/credit-cards']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/credit-cards')
    expect(screen.getByRole('heading', { name: 'Cartões de crédito' })).toBeInTheDocument()
  })

  it('redireciona Dependente autenticado de /credit-cards para a rota inicial', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/credit-cards']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
    expect(screen.queryByRole('heading', { name: 'Cartões de crédito' })).not.toBeInTheDocument()
  })

  it('redireciona usuário não autenticado de /credit-cards para o login', () => {
    render(
      <MemoryRouter initialEntries={['/credit-cards']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('permite que Principal autenticado acesse o detalhe da fatura', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/credit-cards/invoices/i1']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/credit-cards/invoices/i1')
    expect(screen.getByRole('heading', { name: 'Detalhamento da fatura' })).toBeInTheDocument()
  })

  it('redireciona Dependente autenticado do detalhe da fatura para a rota inicial', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/credit-cards/invoices/i1']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
    expect(screen.queryByRole('heading', { name: 'Detalhamento da fatura' })).not.toBeInTheDocument()
  })

  it('redireciona usuário não autenticado do detalhe da fatura para o login', () => {
    render(
      <MemoryRouter initialEntries={['/credit-cards/invoices/i1']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
  })

  it('permite que Principal autenticado acesse /notifications e renderiza a página', async () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/notifications')
    expect(await screen.findByRole('heading', { name: 'Notificações' })).toBeInTheDocument()
    expect(listNotifications).toHaveBeenCalledTimes(1)
  })

  it('oferece acesso às notificações a partir da página inicial autenticada', async () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Alertas' }))

    expect(screen.getByTestId('caminho')).toHaveTextContent('/notifications')
    expect(await screen.findByRole('heading', { name: 'Notificações' })).toBeInTheDocument()
  })

  it('redireciona Dependente autenticado de /notifications para a rota inicial', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
    expect(listNotifications).not.toHaveBeenCalled()
  })

  it('redireciona usuário não autenticado de /notifications para o login', () => {
    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
    expect(listNotifications).not.toHaveBeenCalled()
  })

  it('mantém as rotas existentes acessíveis após a inclusão de /notifications', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    for (const caminho of [
      '/family',
      '/payable-bills',
      '/receivables',
      '/financial-overview',
      '/credit-cards',
    ]) {
      render(
        <MemoryRouter initialEntries={[caminho]}>
          <AuthProvider>
            <Localizacao />
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('caminho')).toHaveTextContent(caminho)
      cleanup()
    }
    expect(listNotifications).not.toHaveBeenCalled()
  })

  it('permite que Principal autenticado acesse /reports-analytics', async () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/reports-analytics']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/reports-analytics')
    expect(await screen.findByRole('heading', { level: 1, name: 'Relatórios de gastos' }))
      .toBeInTheDocument()
    expect(getExpensesByCategory).toHaveBeenCalledTimes(1)
    expect(getExpensesByMember).toHaveBeenCalledTimes(1)
    expect(getSpendingPatterns).toHaveBeenCalledTimes(1)
    expect(getCategoryVariations).toHaveBeenCalledTimes(1)
  })

  it('redireciona Dependente autenticado de /reports-analytics para a rota inicial', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/reports-analytics']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
    expectNenhumaConsultaRelatorios()
  })

  it('redireciona usuário não autenticado de /reports-analytics para o login', () => {
    render(
      <MemoryRouter initialEntries={['/reports-analytics']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
    expectNenhumaConsultaRelatorios()
  })

  it('mantém as rotas existentes acessíveis após a inclusão de /reports-analytics', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    for (const caminho of [
      '/family',
      '/payable-bills',
      '/receivables',
      '/financial-overview',
      '/credit-cards',
      '/notifications',
    ]) {
      render(
        <MemoryRouter initialEntries={[caminho]}>
          <AuthProvider>
            <Localizacao />
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('caminho')).toHaveTextContent(caminho)
      cleanup()
    }
    expectNenhumaConsultaRelatorios()
  })

  it('permite que Principal autenticado acesse /financial-goals', async () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    render(
      <MemoryRouter initialEntries={['/financial-goals']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/financial-goals')
    expect(await screen.findByRole('heading', { level: 1, name: 'Metas financeiras' }))
      .toBeInTheDocument()
    expect(getSavingsSuggestion).toHaveBeenCalledTimes(1)
    expect(listGoals).toHaveBeenCalledTimes(1)
    expect(confirmGoal).not.toHaveBeenCalled()
  })

  it('redireciona Dependente autenticado de /financial-goals para a rota inicial', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

    render(
      <MemoryRouter initialEntries={['/financial-goals']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/')
    expectNenhumaConsultaMetas()
  })

  it('redireciona usuário não autenticado de /financial-goals para o login', () => {
    render(
      <MemoryRouter initialEntries={['/financial-goals']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/login')
    expectNenhumaConsultaMetas()
  })

  it('mantém as rotas existentes acessíveis após a inclusão de /financial-goals', () => {
    sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

    for (const caminho of [
      '/family',
      '/payable-bills',
      '/receivables',
      '/financial-overview',
      '/credit-cards',
      '/notifications',
      '/reports-analytics',
    ]) {
      render(
        <MemoryRouter initialEntries={[caminho]}>
          <AuthProvider>
            <Localizacao />
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('caminho')).toHaveTextContent(caminho)
      cleanup()
    }
    expectNenhumaConsultaMetas()
  })

  it('permite acesso público a /family-invite sem autenticação', () => {
    render(
      <MemoryRouter initialEntries={['/family-invite']}>
        <AuthProvider>
          <Localizacao />
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('caminho')).toHaveTextContent('/family-invite')
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('mantém as rotas existentes funcionando após a inclusão de /family e /family-invite', () => {
    for (const caminho of ['/register', '/login', '/confirm-email']) {
      render(
        <MemoryRouter initialEntries={[caminho]}>
          <AuthProvider>
            <Localizacao />
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('caminho')).toHaveTextContent(caminho)
      cleanup()
    }
  })

  describe('Breadcrumb Família clicável', () => {
    const ROTAS_COM_BREADCRUMB = [
      '/',
      '/payable-bills',
      '/payable-bills/new',
      '/receivables',
      '/receivables/new',
      '/expenses',
      '/credit-cards',
      '/credit-cards/invoices/i1',
      '/financial-overview',
      '/notifications',
      '/reports-analytics',
      '/financial-goals',
    ]

    it('exibe Família como link para a Home em todas as rotas autenticadas', () => {
      for (const caminho of ROTAS_COM_BREADCRUMB) {
        sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

        render(
          <MemoryRouter initialEntries={[caminho]}>
            <AuthProvider>
              <Localizacao />
              <AppRoutes />
            </AuthProvider>
          </MemoryRouter>,
        )

        const breadcrumb = screen.getByRole('navigation', { name: 'Trilha de navegação' })
        expect(within(breadcrumb).getByRole('link', { name: 'Família' }))
          .toHaveAttribute('href', '/')
        cleanup()
      }
    })

    it('redireciona o Principal para a Home ao clicar em Família', () => {
      sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

      render(
        <MemoryRouter initialEntries={['/payable-bills']}>
          <AuthProvider>
            <Localizacao />
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      )

      const breadcrumb = screen.getByRole('navigation', { name: 'Trilha de navegação' })
      fireEvent.click(within(breadcrumb).getByRole('link', { name: 'Família' }))

      expect(screen.getByTestId('caminho')).toHaveTextContent('/')
      expect(screen.getByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
    })

    it('redireciona o Dependente para a Home ao clicar em Família', () => {
      sessionStorage.setItem(SESSION_KEY, sessaoValida('DEPENDENTE'))

      render(
        <MemoryRouter initialEntries={['/expenses']}>
          <AuthProvider>
            <Localizacao />
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      )

      const breadcrumb = screen.getByRole('navigation', { name: 'Trilha de navegação' })
      fireEvent.click(within(breadcrumb).getByRole('link', { name: 'Família' }))

      expect(screen.getByTestId('caminho')).toHaveTextContent('/')
      expect(screen.getByRole('heading', { name: 'Visão geral' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Visão financeira' })).not.toBeInTheDocument()
    })

    it('mantém o breadcrumb da página atual como texto não clicável', () => {
      sessionStorage.setItem(SESSION_KEY, sessaoValida('PRINCIPAL'))

      render(
        <MemoryRouter initialEntries={['/payable-bills']}>
          <AuthProvider>
            <Localizacao />
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      )

      const breadcrumb = screen.getByRole('navigation', { name: 'Trilha de navegação' })
      expect(within(breadcrumb).getAllByRole('link')).toHaveLength(1)
      expect(within(breadcrumb).getByText('Contas a pagar').tagName).toBe('SPAN')
    })
  })
})
