import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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

// Ilustração decorativa: sol em tom pêssego e colinas verdes, em SVG puro
// (sem dependências). Integra-se ao container arredondado do protótipo.
function AuroraIllustration() {
  return (
    <svg
      className="login__illustration"
      viewBox="0 0 320 200"
      role="img"
      aria-label="Sol pêssego sobre colinas verdes"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="320" height="200" className="login__sky" />
      <circle cx="160" cy="96" r="46" className="login__sun" />
      <path className="login__hill login__hill--back" d="M0 150 Q70 96 150 138 Q225 178 320 122 L320 200 L0 200 Z" />
      <path className="login__hill login__hill--front" d="M0 176 Q85 132 170 168 Q250 202 320 160 L320 200 L0 200 Z" />
    </svg>
  )
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
    <main className="login">
      <aside className="login__brand">
        <div className="login__brand-top">
          <p className="login__logo">aurora</p>
          <p className="login__eyebrow login__eyebrow--brand">FINANÇAS EM FAMÍLIA</p>
          <h1 className="login__brand-title">Um novo dia para suas finanças.</h1>
          <p className="login__brand-subtitle">
            Organize o dinheiro da família, um passo de cada vez.
          </p>
        </div>

        <div className="login__art">
          <AuroraIllustration />
        </div>

        <div className="login__brand-bottom">
          <p className="login__quote">Clareza para hoje. Cuidado com o amanhã.</p>
          <p className="login__institutional">
            Seu dinheiro organizado, sem conectar bancos. Os registros são feitos por você e sua família.
          </p>
        </div>
      </aside>

      <section className="login__access">
        <form className="login__form" onSubmit={handleSubmit} noValidate aria-busy={enviando}>
          <header className="login__mobile-intro">
            <p className="login__logo">aurora</p>
            <p className="login__eyebrow">ACESSO · BEM-VINDO AO AURORA</p>
            <h1 className="login__mobile-title">Um novo dia para suas finanças.</h1>
            <p className="login__mobile-subtitle">
              Organize o dinheiro da família, um passo de cada vez.
            </p>
            <div className="login__art login__art--mobile">
              <AuroraIllustration />
            </div>
          </header>

          <header className="login__access-head">
            <p className="login__eyebrow">ACESSO · BEM-VINDO AO AURORA</p>
            <h2 className="login__title">Bom ter você aqui.</h2>
            <p className="login__subtitle">Entre para cuidar das finanças da família.</p>
          </header>

          <div className="login__fields">
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
          </div>

          <p className="login__hint">Os dois campos são obrigatórios.</p>

          {avisoLogout && (
            <div role="status" className="login__notice">
              {avisoLogout}
            </div>
          )}

          {mensagensApi.length > 0 && (
            <div className="login__api-errors" role="alert">
              <p className="login__api-errors-title">E-mail ou senha incorretos</p>
              <p className="login__api-errors-complement">Confira os dados e tente novamente.</p>
              <ul>
                {mensagensApi.map((mensagem, indice) => (
                  <li key={`${indice}-${mensagem}`}>{mensagem}</li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="login__button" disabled={enviando}>
            <span>{enviando ? 'Entrando...' : 'Entrar'}</span>
            <svg className="login__button-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <Link className="login__signup" to="/register">
            <span className="login__signup-question">Ainda não tem uma conta? </span>
            <span className="login__signup-cta">Criar conta</span>
            <span aria-hidden="true" className="login__signup-arrow"> →</span>
          </Link>

          <p className="login__mobile-institutional">
            Seu dinheiro organizado, sem conectar bancos. Os registros são feitos por você e sua família.
          </p>
        </form>
      </section>
    </main>
  )
}
