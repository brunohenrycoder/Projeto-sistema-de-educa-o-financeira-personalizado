/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useInRouterContext, useLocation } from 'react-router-dom'
import { logout as logoutRequest } from '../../features/logout/api/logout.js'
import { setTokenProvider, setUnauthorizedHandler } from '../api/client.js'
import { clearSession, hasRole, isSessionExpired, readSession, saveSession } from './session.js'

export const AuthContext = createContext(null)

// Monitora a confirmação da navegação pós-logout. Quando a location chega a
// /login, a navegação foi concluída e a supressão do ProtectedRoute não é mais
// necessária. Isso não depende de qual componente a rota monta e não reabre a
// corrida que ocorria ao limpar a flag no mesmo tick do navigate().
function EncerramentoMonitor() {
  const { encerrando, fimLogout } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (encerrando && location.pathname === '/login') {
      fimLogout()
    }
  }, [encerrando, location.pathname, fimLogout])

  return null
}

export function AuthProvider({ children }) {
  const inRouter = useInRouterContext()
  const [session, setSession] = useState(() => {
    const armazenada = readSession()
    if (armazenada && !isSessionExpired(armazenada)) return armazenada
    if (armazenada) clearSession()
    return null
  })
  const [unauthorized, setUnauthorized] = useState(false)
  // Estado transitório (nunca sessionStorage): sinaliza ao ProtectedRoute que
  // a queda de autenticação decorre de logout, cuja navegação já carrega o
  // aviso. O ciclo termina quando o LogoutButton dispara a navegação e chama
  // fimLogout(); o mount do LoginPage e um novo login são recuperações extras.
  const [encerrando, setEncerrando] = useState(false)
  const logoutRef = useRef(false)
  const encerrandoRef = useRef(false)

  const invalidate = useCallback(() => {
    clearSession()
    setSession(null)
    setUnauthorized(true)
  }, [])

  const login = useCallback((data) => {
    // Uma nova sessão invalida qualquer flag residual de logout anterior,
    // mesmo que a navegação pós-logout não tenha montado a LoginPage.
    encerrandoRef.current = false
    setEncerrando(false)

    const proxima = saveSession(data)
    setSession(proxima)
    setUnauthorized(false)
    return proxima
  }, [])

  const logout = useCallback(async () => {
    if (logoutRef.current) {
      return { revoked: false, duplicates: true, attempted: false }
    }

    logoutRef.current = true
    encerrandoRef.current = true
    setEncerrando(true)

    const sessaoAtiva = Boolean(session && !isSessionExpired(session))
    const attempted = sessaoAtiva
    let revoked = false

    try {
      if (sessaoAtiva) {
        try {
          await logoutRequest()
          revoked = true
        } catch {
          revoked = false
        }
      }

      clearSession()
      setSession(null)
      setUnauthorized(false)

      return { revoked, attempted }
    } finally {
      encerrandoRef.current = false
      logoutRef.current = false
    }
  }, [session])

  // Encerra o ciclo de logout: chamado pelo LogoutButton assim que a navegação
  // para /login é disparada e, como defesa em profundidade, no mount da LoginPage.
  const fimLogout = useCallback(() => {
    encerrandoRef.current = false
    setEncerrando(false)
  }, [])

  useEffect(() => {
    const handler = () => {
      if (encerrandoRef.current) return
      invalidate()
    }
    setUnauthorizedHandler(handler)
    setTokenProvider(() => session?.accessToken ?? null)

    return () => {
      setUnauthorizedHandler(null)
      setTokenProvider(null)
    }
  }, [session, invalidate])

  useEffect(() => {
    if (!session) return undefined

    const msRestantes = Math.max(0, session.expiresAt - Date.now())
    const timer = setTimeout(() => invalidate(), msRestantes)
    return () => clearTimeout(timer)
  }, [session, invalidate])

  useEffect(() => {
    if (!session) return undefined

    const verificarAoVoltar = () => {
      if (document.visibilityState !== 'visible') return
      if (isSessionExpired(session) || !readSession()) invalidate()
    }

    document.addEventListener('visibilitychange', verificarAoVoltar)
    return () => document.removeEventListener('visibilitychange', verificarAoVoltar)
  }, [session, invalidate])

  const sessaoValida = session && !isSessionExpired(session)

  const value = useMemo(() => ({
    session: sessaoValida ? session : null,
    user: sessaoValida
      ? {
          userId: session.userId,
          familyGroupId: session.familyGroupId,
          name: session.name,
          email: session.email,
          role: session.role,
        }
      : null,
    role: sessaoValida ? session.role : null,
    isAuthenticated: Boolean(sessaoValida),
    hasRole: (...roles) => hasRole(sessaoValida ? session : null, ...roles),
    unauthorized,
    encerrando,
    login,
    logout,
    fimLogout,
  }), [session, sessaoValida, unauthorized, encerrando, login, logout, fimLogout])

  return (
    <AuthContext.Provider value={value}>
      {inRouter && <EncerramentoMonitor />}
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
