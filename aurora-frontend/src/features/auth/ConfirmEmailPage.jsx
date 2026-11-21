import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, getErrorMessages } from '../../shared/api/errors.js'
import { confirmEmail } from './api/confirmEmail.js'
import './ConfirmEmailPage.css'

const MENSAGEM_LINK_INVALIDO = 'Não foi possível confirmar seu e-mail. O link é inválido ou expirou. Sua conta ainda não foi confirmada.'
const MENSAGEM_SUCESSO = 'E-mail confirmado. Entre na sua conta para continuar.'
const FRASE_APOIO = 'Clareza para hoje. Cuidado com o amanhã.'

// Ilustração decorativa da identidade Aurora: sol pêssego e colinas verdes.
// Replicada localmente para não modificar as telas de Login e Register.
function AuroraIllustration() {
  return (
    <svg
      className="confirm-email__illustration"
      viewBox="0 0 320 200"
      role="img"
      aria-label="Sol pêssego sobre colinas verdes"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="320" height="200" className="confirm-email__sky" />
      <circle cx="160" cy="96" r="46" className="confirm-email__sun" />
      <path className="confirm-email__hill confirm-email__hill--back" d="M0 150 Q70 96 150 138 Q225 178 320 122 L320 200 L0 200 Z" />
      <path className="confirm-email__hill confirm-email__hill--front" d="M0 176 Q85 132 170 168 Q250 202 320 160 L320 200 L0 200 Z" />
    </svg>
  )
}

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

function Layout({ eyebrow, titulo, children, acoes }) {
  return (
    <main className="confirm-email">
      <aside className="confirm-email__brand">
        <div className="confirm-email__brand-top">
          <p className="confirm-email__logo">aurora</p>
          <p className="confirm-email__eyebrow confirm-email__eyebrow--brand">FINANÇAS EM FAMÍLIA</p>
          <h2 className="confirm-email__brand-title">Um novo dia para suas finanças.</h2>
          <p className="confirm-email__brand-subtitle">
            Organize o dinheiro da família, um passo de cada vez.
          </p>
        </div>
        <div className="confirm-email__art">
          <AuroraIllustration />
        </div>
        <p className="confirm-email__quote">{FRASE_APOIO}</p>
      </aside>

      <section className="confirm-email__access">
        <div className="confirm-email__content">
          <header className="confirm-email__mobile-intro">
            <p className="confirm-email__logo">aurora</p>
            <p className="confirm-email__eyebrow">{eyebrow}</p>
          </header>
          <header className="confirm-email__head">
            <p className="confirm-email__eyebrow confirm-email__eyebrow--desktop">{eyebrow}</p>
            <h1 className="confirm-email__title">{titulo}</h1>
          </header>
          <div className="confirm-email__body">{children}</div>
          {acoes && <div className="confirm-email__actions">{acoes}</div>}
        </div>
      </section>
    </main>
  )
}

export default function ConfirmEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email
  const pendente = location.state?.pending === true
  const [estado, setEstado] = useState(() => {
    if (pendente) return 'pendente'
    return lerTokenDoFragmento() ? 'carregando' : 'link-invalido'
  })
  const [mensagensApi, setMensagensApi] = useState([])
  const processadoRef = useRef(false)

  useEffect(() => {
    if (pendente) return undefined
    if (processadoRef.current) return
    processadoRef.current = true

    const token = lerTokenDoFragmento()

    if (!token) {
      limparFragmento()
      return
    }

    confirmEmail(token)
      .then(() => setEstado('sucesso'))
      .catch((erro) => {
        if (erro instanceof ApiError && erro.status === 400) {
          setEstado('link-invalido')
          return
        }
        setMensagensApi(getErrorMessages(erro))
        setEstado('erro')
      })
      .finally(() => limparFragmento())
  }, [pendente])

  if (estado === 'carregando') {
    return (
      <main className="confirm-email">
        <section className="confirm-email__access">
          <p className="confirm-email__loading" role="status">Confirmando seu e-mail...</p>
        </section>
      </main>
    )
  }

  if (estado === 'pendente') {
    return (
      <Layout
        eyebrow="ACESSO · CONFIRMAÇÃO DE E-MAIL"
        titulo="Verifique seu e-mail."
        acoes={
          <button type="button" className="confirm-email__button" onClick={() => navigate('/login')}>
            Voltar para o login
          </button>
        }
      >
        <p>
          Enviamos um e-mail de confirmação{email ? <> para <strong>{email}</strong></> : ''}.
        </p>
        <p>Clique no link recebido para confirmar sua conta.</p>
        <p className="confirm-email__detail">O link possui validade de 24 horas. Faça a confirmação dentro desse prazo.</p>
      </Layout>
    )
  }

  if (estado === 'sucesso') {
    return (
      <Layout
        eyebrow="ACESSO · CONFIRMAÇÃO DE E-MAIL"
        titulo="E-mail confirmado."
        acoes={
          <button type="button" className="confirm-email__button" onClick={() => navigate('/login')}>
            Entrar na conta
          </button>
        }
      >
        <p>{MENSAGEM_SUCESSO}</p>
        {email && <p className="confirm-email__detail"><strong>{email}</strong></p>}
        <div className="confirm-email__info">
          Sua conta está confirmada. Use o e-mail e a senha definidos no cadastro para entrar.
        </div>
      </Layout>
    )
  }

  if (estado === 'link-invalido') {
    return (
      <Layout
        eyebrow="ACESSO · CONFIRMAÇÃO DE E-MAIL"
        titulo="Link inválido ou expirado."
        acoes={
          <>
            <button type="button" className="confirm-email__button" onClick={() => navigate('/register')}>
              Voltar ao cadastro
            </button>
            <Link className="confirm-email__link" to="/login">Voltar para o login</Link>
          </>
        }
      >
        <p role="alert">{MENSAGEM_LINK_INVALIDO}</p>
        <div className="confirm-email__info">
          <p className="confirm-email__info-title">Como continuar</p>
          <p>Volte ao cadastro para criar uma nova conta e realizar uma nova confirmação.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      eyebrow="ACESSO · CONFIRMAÇÃO DE E-MAIL"
      titulo="Confirmação de e-mail"
      acoes={
        <button type="button" className="confirm-email__button" onClick={() => navigate('/login')}>
          Voltar para o login
        </button>
      }
    >
      <div role="alert">
        <ul>
          {mensagensApi.map((mensagem, indice) => (
            <li key={`${indice}-${mensagem}`}>{mensagem}</li>
          ))}
        </ul>
      </div>
    </Layout>
  )
}
