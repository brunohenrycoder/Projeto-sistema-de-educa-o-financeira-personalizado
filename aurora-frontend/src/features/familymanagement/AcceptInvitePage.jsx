import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getErrorMessages } from '../../shared/api/errors.js'
import { acceptInvite } from './api/acceptInvite.js'
import './AcceptInvitePage.css'

const FRASE_APOIO = 'Clareza para hoje. Cuidado com o amanhã.'
const MENSAGEM_SEM_TOKEN =
  'Não foi possível abrir o convite. O link está incompleto ou inválido. Solicite um novo convite ao responsável.'
const MENSAGEM_SUCESSO =
  'Convite aceito. Sua conta foi criada e já pode ser acessada com o e-mail e a senha cadastrados.'

function lerTokenDoFragmento() {
  const hash = window.location.hash
  if (!hash.startsWith('#token=')) return null

  const valor = hash.slice('#token='.length).split('&')[0]
  if (!valor) return null

  try {
    return decodeURIComponent(valor)
  } catch {
    return valor
  }
}

function limparFragmento() {
  if (!window.location.hash) return
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}

function validar({ email, name, password, passwordConfirmation }) {
  const erros = {}
  const emailNormalizado = email.trim()
  const nome = name.trim()

  if (!emailNormalizado) {
    erros.email = 'Informe seu e-mail.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
    erros.email = 'Informe um e-mail válido.'
  }

  if (!nome) {
    erros.name = 'Informe seu nome.'
  } else if (nome.length < 3 || nome.length > 100) {
    erros.name = 'O nome deve ter entre 3 e 100 caracteres.'
  }

  if (!password) {
    erros.password = 'Informe sua senha.'
  } else if (password.length < 8) {
    erros.password = 'A senha deve ter no mínimo 8 caracteres.'
  }

  if (!passwordConfirmation) {
    erros.passwordConfirmation = 'Confirme sua senha.'
  } else if (passwordConfirmation !== password) {
    erros.passwordConfirmation = 'As senhas não coincidem.'
  }

  return erros
}

// Ilustração decorativa da identidade Aurora (sol pêssego e colinas verdes).
function AuroraIllustration() {
  return (
    <svg
      className="accept-invite__illustration"
      viewBox="0 0 320 200"
      role="img"
      aria-label="Sol pêssego sobre colinas verdes"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="320" height="200" className="accept-invite__sky" />
      <circle cx="160" cy="96" r="46" className="accept-invite__sun" />
      <path className="accept-invite__hill accept-invite__hill--back" d="M0 150 Q70 96 150 138 Q225 178 320 122 L320 200 L0 200 Z" />
      <path className="accept-invite__hill accept-invite__hill--front" d="M0 176 Q85 132 170 168 Q250 202 320 160 L320 200 L0 200 Z" />
    </svg>
  )
}

export default function AcceptInvitePage() {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => lerTokenDoFragmento())
  const [formulario, setFormulario] = useState({
    email: '',
    name: '',
    password: '',
    passwordConfirmation: '',
  })
  const [erros, setErros] = useState({})
  const [mensagensErro, setMensagensErro] = useState([])
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  const tokenValido = typeof token === 'string' && token.length > 0

  function atualizarCampo(evento) {
    const { name, value } = evento.target
    setFormulario((anterior) => ({ ...anterior, [name]: value }))
  }

  async function handleSubmit(evento) {
    evento.preventDefault()
    if (enviandoRef.current || !tokenValido) return

    const errosEncontrados = validar(formulario)
    setErros(errosEncontrados)
    setMensagensErro([])
    if (Object.keys(errosEncontrados).length > 0) return

    enviandoRef.current = true
    setEnviando(true)

    try {
      await acceptInvite({
        token,
        email: formulario.email.trim(),
        name: formulario.name.trim(),
        password: formulario.password,
        passwordConfirmation: formulario.passwordConfirmation,
      })
      limparFragmento()
      setSucesso(true)
      setToken(null)
    } catch (erroApi) {
      setMensagensErro(getErrorMessages(erroApi))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <main className="accept-invite">
      <header className="accept-invite__head">
        <p className="accept-invite__logo">aurora</p>
        <p className="accept-invite__eyebrow">ACESSO · CONVITE FAMILIAR</p>
        <h1 className="accept-invite__title">Aceite seu convite.</h1>
        <p className="accept-invite__subtitle">
          Crie sua conta para participar do grupo familiar.
        </p>
        <div className="accept-invite__art">
          <AuroraIllustration />
        </div>
      </header>

      {sucesso ? (
        <section className="accept-invite__success" role="status">
          <p>{MENSAGEM_SUCESSO}</p>
          <button
            type="button"
            className="accept-invite__button"
            onClick={() => navigate('/login')}
          >
            Ir para o login
          </button>
        </section>
      ) : !tokenValido ? (
        <section className="accept-invite__error" role="alert">
          <p>{MENSAGEM_SEM_TOKEN}</p>
          <Link className="accept-invite__link" to="/login">Voltar para o login</Link>
        </section>
      ) : (
        <form className="accept-invite__form" onSubmit={handleSubmit} noValidate>
          <div className="accept-invite__field">
            <label htmlFor="accept-email">E-mail</label>
            <input
              id="accept-email"
              name="email"
              type="email"
              autoComplete="email"
              value={formulario.email}
              onChange={atualizarCampo}
              aria-invalid={Boolean(erros.email)}
              aria-describedby={erros.email ? 'accept-email-error' : undefined}
              disabled={enviando}
            />
            {erros.email && (
              <span id="accept-email-error" className="accept-invite__field-error" role="alert">
                {erros.email}
              </span>
            )}
          </div>

          <div className="accept-invite__field">
            <label htmlFor="accept-name">Nome</label>
            <input
              id="accept-name"
              name="name"
              type="text"
              autoComplete="name"
              value={formulario.name}
              onChange={atualizarCampo}
              aria-invalid={Boolean(erros.name)}
              aria-describedby={erros.name ? 'accept-name-error' : undefined}
              disabled={enviando}
            />
            {erros.name && (
              <span id="accept-name-error" className="accept-invite__field-error" role="alert">
                {erros.name}
              </span>
            )}
          </div>

          <div className="accept-invite__field">
            <label htmlFor="accept-password">Senha</label>
            <input
              id="accept-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formulario.password}
              onChange={atualizarCampo}
              aria-invalid={Boolean(erros.password)}
              aria-describedby={erros.password ? 'accept-password-error' : undefined}
              disabled={enviando}
            />
            {erros.password && (
              <span id="accept-password-error" className="accept-invite__field-error" role="alert">
                {erros.password}
              </span>
            )}
          </div>

          <div className="accept-invite__field">
            <label htmlFor="accept-password-confirmation">Confirmação de senha</label>
            <input
              id="accept-password-confirmation"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              value={formulario.passwordConfirmation}
              onChange={atualizarCampo}
              aria-invalid={Boolean(erros.passwordConfirmation)}
              aria-describedby={erros.passwordConfirmation ? 'accept-password-confirmation-error' : undefined}
              disabled={enviando}
            />
            {erros.passwordConfirmation && (
              <span id="accept-password-confirmation-error" className="accept-invite__field-error" role="alert">
                {erros.passwordConfirmation}
              </span>
            )}
          </div>

          {mensagensErro.length > 0 && (
            <div className="accept-invite__api-errors" role="alert">
              <ul>
                {mensagensErro.map((mensagem, indice) => (
                  <li key={`${indice}-${mensagem}`}>{mensagem}</li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="accept-invite__button" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Aceitar convite'}
          </button>
        </form>
      )}

      <p className="accept-invite__quote">{FRASE_APOIO}</p>
    </main>
  )
}
