import { useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/useAuth.js'
import RegisterPage from '../features/register/RegisterPage.jsx'
import ConfirmEmailPage from '../features/confirmemail/ConfirmEmailPage.jsx'
import LoginPage from '../features/login/LoginPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import AuthenticatedHome from './AuthenticatedHome.jsx'

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
        <Route path="*" element={null} />
      </Routes>
    </>
  )
}
