import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessages } from '../../shared/api/errors.js'
import { useAuth } from '../../shared/auth/useAuth.js'
import { login } from './api/login.js'
import './LoginPage.css'

const FORMULARIO_INICIAL = {
  email: '',
  password: '',
}

function validar({ email, password }) {
  const erros = {}
  const emailNormalizado = email.trim()

  if (!emailNormalizado) {
    erros.email = 'Informe seu e-mail.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
    erros.email = 'Informe um e-mail válido.'
  }

  if (!password) {
    erros.password = 'Informe sua senha.'
  }

  return erros
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: entrar, fimLogout } = useAuth()
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [erros, setErros] = useState({})
  const [mensagensApi, setMensagensApi] = useState([])
  const [avisoLogout, setAvisoLogout] = useState('')
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const avisoTimerRef = useRef(null)
  const logoutNotice = location.state?.logoutNotice

  useEffect(() => {
    fimLogout()
  }, [fimLogout])

  useEffect(() => {
    if (typeof logoutNotice !== 'string' || !logoutNotice) return undefined

    avisoTimerRef.current = setTimeout(() => setAvisoLogout(logoutNotice), 0)

    return () => {
      clearTimeout(avisoTimerRef.current)
      avisoTimerRef.current = null
    }
  }, [logoutNotice])

  function atualizarCampo(evento) {
    const { name, value } = evento.target
    setFormulario((anterior) => ({ ...anterior, [name]: value }))
  }

  async function handleSubmit(evento) {
    evento.preventDefault()
    if (enviandoRef.current) return

    const errosEncontrados = validar(formulario)
    setErros(errosEncontrados)
    setMensagensApi([])
    // Um novo envio cancela o aviso pendente: o timer não pode reapresentá-lo.
    clearTimeout(avisoTimerRef.current)
    avisoTimerRef.current = null
    setAvisoLogout('')

    if (Object.keys(errosEncontrados).length > 0) return

    enviandoRef.current = true
    setEnviando(true)

    try {
      const resposta = await login({
        email: formulario.email.trim(),
        password: formulario.password,
      })

      entrar(resposta)

      const destino = location.state?.from?.pathname || '/'
      navigate(destino, { replace: true })
    } catch (erro) {
      setMensagensApi(getErrorMessages(erro))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <main className="container login">
      <form className="login__form" onSubmit={handleSubmit} noValidate aria-busy={enviando}>
        <h1 className="login__title">Entrar</h1>
        <p className="login__subtitle">Acesse sua conta Aurora.</p>

        <div className="login__field">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={formulario.email}
            onChange={atualizarCampo}
            aria-invalid={Boolean(erros.email)}
            aria-describedby={erros.email ? 'login-email-error' : undefined}
          />
          {erros.email && (
            <span id="login-email-error" className="login__error" role="alert">
              {erros.email}
            </span>
          )}
        </div>

        <div className="login__field">
          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={formulario.password}
            onChange={atualizarCampo}
            aria-invalid={Boolean(erros.password)}
            aria-describedby={erros.password ? 'login-password-error' : undefined}
          />
          {erros.password && (
            <span id="login-password-error" className="login__error" role="alert">
              {erros.password}
            </span>
          )}
        </div>

        {avisoLogout && (
          <div role="status" className="login__notice">
            {avisoLogout}
          </div>
        )}

        {mensagensApi.length > 0 && (
          <div className="login__api-errors" role="alert">
            <ul>
              {mensagensApi.map((mensagem, indice) => (
                <li key={`${indice}-${mensagem}`}>{mensagem}</li>
              ))}
            </ul>
          </div>
        )}

        <button type="submit" className="login__button" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
