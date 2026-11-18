import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, getErrorMessages } from '../../shared/api/errors.js'
import { confirmEmail } from './api/confirmEmail.js'
import './ConfirmEmailPage.css'

const MENSAGEM_LINK_INVALIDO = 'Não foi possível confirmar seu e-mail. O link é inválido ou expirou. Sua conta ainda não foi confirmada.'
const MENSAGEM_SUCESSO = 'E-mail confirmado. Entre na sua conta para continuar.'

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

export default function ConfirmEmailPage() {
  const navigate = useNavigate()
  const [estado, setEstado] = useState(() => (lerTokenDoFragmento() ? 'carregando' : 'link-invalido'))
  const [mensagensApi, setMensagensApi] = useState([])
  const processadoRef = useRef(false)

  useEffect(() => {
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
  }, [])

  if (estado === 'carregando') {
    return (
      <main className="container confirm-email">
        <p role="status">Confirmando seu e-mail...</p>
      </main>
    )
  }

  if (estado === 'sucesso') {
    return (
      <main className="container confirm-email">
        <div className="confirm-email__card">
          <h1>E-mail confirmado</h1>
          <p>{MENSAGEM_SUCESSO}</p>
          <button type="button" className="confirm-email__button" onClick={() => navigate('/login')}>
            Entrar na conta
          </button>
        </div>
      </main>
    )
  }

  if (estado === 'link-invalido') {
    return (
      <main className="container confirm-email">
        <div className="confirm-email__card">
          <h1>Confirmação de e-mail</h1>
          <p role="alert">{MENSAGEM_LINK_INVALIDO}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="container confirm-email">
      <div className="confirm-email__card">
        <h1>Confirmação de e-mail</h1>
        <div role="alert">
          <ul>
            {mensagensApi.map((mensagem, indice) => (
              <li key={`${indice}-${mensagem}`}>{mensagem}</li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
