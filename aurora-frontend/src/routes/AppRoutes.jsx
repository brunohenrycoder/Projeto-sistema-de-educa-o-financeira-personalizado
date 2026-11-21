import { useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/useAuth.js'
import RegisterPage from '../features/auth/RegisterPage.jsx'
import ConfirmEmailPage from '../features/auth/ConfirmEmailPage.jsx'
import LoginPage from '../features/auth/LoginPage.jsx'
import FamilyPage from '../features/familymanagement/FamilyPage.jsx'
import AcceptInvitePage from '../features/familymanagement/AcceptInvitePage.jsx'
import ExpensesPage from '../features/expenses/ExpensesPage.jsx'
import RegisterExpensePage from '../features/expenses/RegisterExpensePage.jsx'
import PayableBillsPage from '../features/payablebills/PayableBillsPage.jsx'
import RegisterPayableBillPage from '../features/payablebills/RegisterPayableBillPage.jsx'
import ReceivablesPage from '../features/receivables/ReceivablesPage.jsx'
import RegisterReceivablePage from '../features/receivables/RegisterReceivablePage.jsx'
import FinancialOverviewPage from '../features/financialoverview/FinancialOverviewPage.jsx'
import CreditCardsPage from '../features/creditcards/CreditCardsPage.jsx'
import CreditCardInvoicePage from '../features/creditcards/CreditCardInvoicePage.jsx'
import NotificationsPage from '../features/notifications/NotificationsPage.jsx'
import ReportsAnalyticsPage from '../features/reportsanalytics/ReportsAnalyticsPage.jsx'
import FinancialGoalsPage from '../features/financialgoals/FinancialGoalsPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import AuthenticatedHome from './AuthenticatedHome.jsx'
import AuthenticatedLayout from './AuthenticatedLayout.jsx'

function comLayout(element) {
  return <AuthenticatedLayout>{element}</AuthenticatedLayout>
}

function UnauthorizedRedirect() {
  const { unauthorized } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (unauthorized) {
      navigate('/login', { replace: true })
    }
  }, [unauthorized, navigate])

  return null
}

export default function AppRoutes() {
  return (
    <>
      <UnauthorizedRedirect />
      <Routes>
        {/* Rotas do Ciclo 1: autenticação e rota protegida provisória. */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AuthenticatedHome />
            </ProtectedRoute>
          }
        />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/family-invite" element={<AcceptInvitePage />} />
        <Route
          path="/family"
          element={
            <ProtectedRoute roles={['PRINCIPAL']}>
              {comLayout(<FamilyPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              {comLayout(<ExpensesPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses/new"
          element={
            <ProtectedRoute>
              {comLayout(<RegisterExpensePage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/payable-bills"
          element={
            <ProtectedRoute roles={['PRINCIPAL']}>
              {comLayout(<PayableBillsPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/payable-bills/new"
          element={
            <ProtectedRoute roles={['PRINCIPAL']}>
              {comLayout(<RegisterPayableBillPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/receivables"
          element={
            <ProtectedRoute roles={['PRINCIPAL']}>
              {comLayout(<ReceivablesPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/receivables/new"
          element={
            <ProtectedRoute roles={['PRINCIPAL']}>
              {comLayout(<RegisterReceivablePage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/financial-overview"
          element={
            <ProtectedRoute roles={['PRINCIPAL']}>
              {comLayout(<FinancialOverviewPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/credit-cards"
          element={
            <ProtectedRoute roles={['PRINCIPAL']}>
              {comLayout(<CreditCardsPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/credit-cards/invoices/:invoiceId"
          element={
            <ProtectedRoute roles={['PRINCIPAL']}>
              {comLayout(<CreditCardInvoicePage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute roles={['PRINCIPAL']}>
              {comLayout(<NotificationsPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports-analytics"
          element={
            <ProtectedRoute roles={['PRINCIPAL']}>
              {comLayout(<ReportsAnalyticsPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/financial-goals"
          element={
            <ProtectedRoute roles={['PRINCIPAL']}>
              {comLayout(<FinancialGoalsPage />)}
            </ProtectedRoute>
          }
        />
        <Route path="*" element={null} />
      </Routes>
    </>
  )
}
