import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../shared/auth/useAuth.js'
import { isSessionExpired, readSession, hasRole as verificarPapel } from '../shared/auth/session.js'

export default function ProtectedRoute({ roles, children }) {
  const { encerrando } = useAuth()
  const location = useLocation()

  // O sessionStorage é a fonte de verdade síncrona: saveSession/clearSession
  // gravam antes de qualquer navigate, evitando a janela entre o setSession
  // do AuthContext e o commit do React que causava redirecionamentos
  // concorrentes no login e no logout.
  const sessao = readSession()
  const autenticado = Boolean(sessao && !isSessionExpired(sessao))

  // No logout, o LogoutButton é o único responsável por navegar para /login;
  // manter as children montadas preserva o aviso no location.state.
  if (!encerrando) {
    if (!autenticado) {
      return <Navigate to="/login" replace state={{ from: location }} />
    }

    if (Array.isArray(roles) && roles.length > 0 && !verificarPapel(sessao, ...roles)) {
      return <Navigate to="/" replace />
    }
  }

  return children
}
