import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getErrorMessages } from '../../shared/api/errors.js'
import { registerUser } from './api/registerUser.js'
import './RegisterPage.css'

const FORMULARIO_INICIAL = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

function validar({ name, email, password, passwordConfirmation }) {
  const erros = {}
  const nome = name.trim()
  const emailNormalizado = email.trim()

  if (!nome) {
    erros.name = 'Informe seu nome.'
  } else if (nome.length < 3) {
    erros.name = 'O nome deve ter no mínimo 3 caracteres.'
  }

  if (!emailNormalizado) {
    erros.email = 'Informe seu e-mail.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
    erros.email = 'Informe um e-mail válido.'
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

// Ilustração decorativa reutilizada da identidade visual Aurora:
// sol em tom pêssego e colinas verdes, em SVG puro (sem dependências).
function AuroraIllustration() {
  return (
    <svg
      className="register__illustration"
      viewBox="0 0 320 200"
      role="img"
      aria-label="Sol pêssego sobre colinas verdes"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="320" height="200" className="register__sky" />
      <circle cx="160" cy="96" r="46" className="register__sun" />
      <path className="register__hill register__hill--back" d="M0 150 Q70 96 150 138 Q225 178 320 122 L320 200 L0 200 Z" />
      <path className="register__hill register__hill--front" d="M0 176 Q85 132 170 168 Q250 202 320 160 L320 200 L0 200 Z" />
    </svg>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [erros, setErros] = useState({})
  const [mensagensApi, setMensagensApi] = useState([])
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

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
    setMensagemSucesso('')

    if (Object.keys(errosEncontrados).length > 0) return

    enviandoRef.current = true
    setEnviando(true)

    try {
      const resposta = await registerUser({
        name: formulario.name.trim(),
        email: formulario.email.trim(),
        password: formulario.password,
        passwordConfirmation: formulario.passwordConfirmation,
      })
      setMensagemSucesso('Cadastro realizado. Verifique seu e-mail para confirmar sua conta.')
      navigate('/confirm-email', {
        state: {
          pending: true,
          email: resposta?.email ?? formulario.email.trim(),
        },
      })
    } catch (erro) {
      setMensagensApi(getErrorMessages(erro))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <main className="register">
      <aside className="register__brand">
        <div className="register__brand-top">
          <p className="register__logo">aurora</p>
          <p className="register__eyebrow register__eyebrow--brand">FINANÇAS EM FAMÍLIA</p>
          <h1 className="register__brand-title">Um novo dia para suas finanças.</h1>
          <p className="register__brand-subtitle">
            Organize o dinheiro da família, um passo de cada vez.
          </p>
        </div>

        <div className="register__art">
          <AuroraIllustration />
        </div>

        <div className="register__brand-bottom">
          <p className="register__quote">Clareza para hoje. Cuidado com o amanhã.</p>
          <p className="register__institutional">
            Seu dinheiro organizado, sem conectar bancos. Os registros são feitos por você e sua família.
          </p>
        </div>
      </aside>

      <section className="register__access">
        <form className="register__form" onSubmit={handleSubmit} noValidate aria-busy={enviando}>
          <header className="register__mobile-intro">
            <p className="register__logo">aurora</p>
            <p className="register__eyebrow">ACESSO · CADASTRO</p>
            <h1 className="register__mobile-title">Comece pela sua família.</h1>
            <p className="register__mobile-subtitle">
              Crie seu acesso para organizar a rotina financeira juntos.
            </p>
            <div className="register__notice-block register__notice-block--mobile">
              <p className="register__notice-title">Você será o responsável</p>
              <p className="register__notice-text">
                Seu grupo familiar será criado automaticamente e você poderá acompanhar o panorama e adicionar dependentes.
              </p>
            </div>
            <div className="register__art register__art--mobile">
              <AuroraIllustration />
            </div>
          </header>

          <header className="register__access-head">
            <p className="register__eyebrow">ACESSO · CRIAR CONTA</p>
            <h2 className="register__title">Comece pela sua família.</h2>
            <p className="register__subtitle">Cadastre seus dados como responsável.</p>
          </header>

          <div className="register__fields">
            <div className="register__field">
              <label htmlFor="register-name">Nome</label>
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                value={formulario.name}
                onChange={atualizarCampo}
                aria-invalid={Boolean(erros.name)}
                aria-describedby={erros.name ? 'register-name-error' : 'register-name-help'}
              />
              <p id="register-name-help" className="register__help">Mínimo de 3 caracteres.</p>
              {erros.name && (
                <span id="register-name-error" className="register__error" role="alert">
                  {erros.name}
                </span>
              )}
            </div>

            <div className="register__field">
              <label htmlFor="register-email">E-mail</label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formulario.email}
                onChange={atualizarCampo}
                aria-invalid={Boolean(erros.email)}
                aria-describedby={erros.email ? 'register-email-error' : 'register-email-help'}
              />
              <p id="register-email-help" className="register__help">
                Deve ser válido e não estar previamente cadastrado.
              </p>
              {erros.email && (
                <span id="register-email-error" className="register__error" role="alert">
                  {erros.email}
                </span>
              )}
            </div>

            <div className="register__field">
              <label htmlFor="register-password">Senha</label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={formulario.password}
                onChange={atualizarCampo}
                aria-invalid={Boolean(erros.password)}
                aria-describedby={erros.password ? 'register-password-error' : 'register-password-help'}
              />
              <p id="register-password-help" className="register__help">Mínimo de 8 caracteres.</p>
              {erros.password && (
                <span id="register-password-error" className="register__error" role="alert">
                  {erros.password}
                </span>
              )}
            </div>

            <div className="register__field">
              <label htmlFor="register-password-confirmation">Confirmação de senha</label>
              <input
                id="register-password-confirmation"
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                value={formulario.passwordConfirmation}
                onChange={atualizarCampo}
                aria-invalid={Boolean(erros.passwordConfirmation)}
                aria-describedby={erros.passwordConfirmation ? 'register-password-confirmation-error' : 'register-password-confirmation-help'}
              />
              <p id="register-password-confirmation-help" className="register__help">
                Digite a mesma senha informada acima.
              </p>
              {erros.passwordConfirmation && (
                <span id="register-password-confirmation-error" className="register__error" role="alert">
                  {erros.passwordConfirmation}
                </span>
              )}
            </div>
          </div>

          <div className="register__notice-block">
            <p className="register__notice-title">Seu grupo familiar começa aqui</p>
            <p className="register__notice-text">
              O grupo familiar será criado automaticamente durante o cadastro e você será definido como Principal.
            </p>
          </div>

          <div className="register__profile">
            <p className="register__profile-title">Perfil automático</p>
            <p className="register__profile-row"><strong>Perfil:</strong> Responsável</p>
            <p className="register__profile-row"><strong>Identificador:</strong> Gerado ao criar a conta</p>
            <p className="register__profile-note">
              Esses dados são definidos pelo Aurora e não podem ser editados nesta tela.
            </p>
          </div>

          {mensagensApi.length > 0 && (
            <div className="register__api-errors" role="alert">
              <ul>
                {mensagensApi.map((mensagem, indice) => (
                  <li key={`${indice}-${mensagem}`}>{mensagem}</li>
                ))}
              </ul>
            </div>
          )}

          {mensagemSucesso && (
            <div className="register__success" role="status">
              {mensagemSucesso}
            </div>
          )}

          <button type="submit" className="register__button" disabled={enviando} aria-label="Criar conta">
            {enviando ? (
              <span>Enviando...</span>
            ) : (
              <>
                <span className="register__button-desktop">Criar conta de responsável</span>
                <span className="register__button-mobile">Criar minha conta</span>
              </>
            )}
            <svg className="register__button-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <Link className="register__signin" to="/login">
            <span>Já tenho conta · Entrar</span>
            <span aria-hidden="true" className="register__signin-arrow"> →</span>
          </Link>

          <p className="register__mobile-institutional">
            Seu dinheiro organizado, sem conectar bancos. Os registros são feitos por você e sua família.
          </p>
        </form>
      </section>
    </main>
  )
}
