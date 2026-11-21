import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/useAuth.js'
import './LogoutButton.css'

const MENSAGEM_FALHA_REVOGACAO =
  'Sessão encerrada neste dispositivo. Não foi possível confirmar a revogação no servidor.'

export default function LogoutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [saindo, setSaindo] = useState(false)
  const clicandoRef = useRef(false)

  async function handleClick() {
    if (clicandoRef.current) return

    clicandoRef.current = true
    setSaindo(true)

    let resultado = null

    try {
      resultado = await logout()
    } finally {
      const aviso =
        resultado?.attempted === true && resultado?.revoked === false
          ? { logoutNotice: MENSAGEM_FALHA_REVOGACAO }
          : undefined

      // A limpeza da flag encerrando é feita pelo AuthProvider quando a
      // navegação para /login for confirmada (mudança de location), não aqui:
      // limpar no mesmo tick do navigate() reabriria a corrida com o
      // ProtectedRoute, que sobrescreveria o aviso no location.state.
      navigate('/login', { replace: true, state: aviso })
      clicandoRef.current = false
      setSaindo(false)
    }
  }

  return (
    <button type="button" className="logout-button" onClick={handleClick} disabled={saindo}>
      {saindo ? 'Saindo...' : 'Sair'}
    </button>
  )
}
