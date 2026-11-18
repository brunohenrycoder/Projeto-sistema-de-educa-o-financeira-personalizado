import { useRef, useState } from 'react'
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

export default function RegisterPage() {
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
      await registerUser({
        name: formulario.name.trim(),
        email: formulario.email.trim(),
        password: formulario.password,
        passwordConfirmation: formulario.passwordConfirmation,
      })
      setMensagemSucesso('Cadastro realizado. Verifique seu e-mail para confirmar sua conta.')
    } catch (erro) {
      setMensagensApi(getErrorMessages(erro))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <main className="container register">
      <form className="register__form" onSubmit={handleSubmit} noValidate aria-busy={enviando}>
        <h1 className="register__title">Criar conta</h1>
        <p className="register__subtitle">Cadastre-se como responsável pela família.</p>

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
            aria-describedby={erros.name ? 'register-name-error' : undefined}
          />
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
            aria-describedby={erros.email ? 'register-email-error' : undefined}
          />
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
            aria-describedby={erros.password ? 'register-password-error' : undefined}
          />
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
            aria-describedby={erros.passwordConfirmation ? 'register-password-confirmation-error' : undefined}
          />
          {erros.passwordConfirmation && (
            <span id="register-password-confirmation-error" className="register__error" role="alert">
              {erros.passwordConfirmation}
            </span>
          )}
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

        <button type="submit" className="register__button" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Criar conta'}
        </button>
      </form>
    </main>
  )
}
