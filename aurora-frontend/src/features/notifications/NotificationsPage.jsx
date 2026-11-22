import { useCallback, useEffect, useRef, useState } from 'react'
import HomeBreadcrumbLink from '../../shared/components/HomeBreadcrumbLink.jsx'
import { getErrorMessages } from '../../shared/api/errors.js'
import { listNotifications } from './api/listNotifications.js'
import './NotificationsPage.css'

const ROTULOS_TIPO = {
  LEMBRETE_VENCIMENTO: 'Lembrete de vencimento',
  ALERTA_DESPESAS: 'Alerta de despesas',
}

const CLASSES_TIPO = {
  LEMBRETE_VENCIMENTO: 'notifications__item--lembrete',
  ALERTA_DESPESAS: 'notifications__item--alerta',
}

function rotuloTipo(type) {
  return ROTULOS_TIPO[type] ?? 'Notificação'
}

function classeTipo(type) {
  return CLASSES_TIPO[type] ?? 'notifications__item--outro'
}

function formatarDataHora(valor) {
  const texto = String(valor ?? '')
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!partes) return ''

  const [, ano, mes, dia, hora, minuto] = partes
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`
}

export default function NotificationsPage() {
  const [estado, setEstado] = useState('carregando')
  const [notificacoes, setNotificacoes] = useState([])
  const [mensagensErro, setMensagensErro] = useState([])
  const requisicaoAtualRef = useRef(0)

  const carregar = useCallback(() => {
    const id = ++requisicaoAtualRef.current

    setEstado('carregando')
    setMensagensErro([])

    return listNotifications()
      .then((resposta) => {
        if (id !== requisicaoAtualRef.current) return
        setNotificacoes(Array.isArray(resposta?.notifications) ? resposta.notifications : [])
        setEstado('pronto')
      })
      .catch((erro) => {
        if (id !== requisicaoAtualRef.current) return
        setMensagensErro(getErrorMessages(erro))
        setEstado('erro')
      })
  }, [])

  useEffect(() => {
    const timer = setTimeout(carregar, 0)
    return () => {
      clearTimeout(timer)
      requisicaoAtualRef.current += 1
    }
  }, [carregar])

  return (
    <main className="container notifications">
      <nav className="notifications__breadcrumb" aria-label="Trilha de navegação">
        <HomeBreadcrumbLink />
        <span aria-hidden="true">/</span>
        <span aria-current="page">Notificações</span>
      </nav>

      <header className="notifications__hero">
        <div className="notifications__intro">
          <p className="notifications__eyebrow">Acompanhe as atualizações</p>
          <h1 className="notifications__title">Notificações</h1>
          <p className="notifications__subtitle">
            Acompanhe os alertas e lembretes do grupo familiar.
          </p>
        </div>
      </header>

      <section
        className="notifications__section"
        aria-labelledby="notifications-section-title"
      >
        <h2 className="notifications__section-title" id="notifications-section-title">
          Alertas e lembretes
        </h2>

        {estado === 'carregando' && (
          <p className="notifications__status" role="status">Carregando notificações...</p>
        )}

        {estado === 'erro' && (
          <div className="notifications__error" role="alert">
            {mensagensErro.map((mensagem, indice) => (
              <p key={indice}>{mensagem}</p>
            ))}
            <button type="button" className="notifications__retry" onClick={carregar}>
              Tentar novamente
            </button>
          </div>
        )}

        {estado === 'pronto' && (
          notificacoes.length === 0 ? (
            <p className="notifications__empty">Nenhuma notificação no momento.</p>
          ) : (
            <ul className="notifications__list" data-testid="notifications-lista">
              {notificacoes.map((notificacao, indice) => {
                const dataHora = formatarDataHora(notificacao.createdAt)

                return (
                  <li
                    className={`notifications__item ${classeTipo(notificacao.type)}`}
                    data-type={notificacao.type}
                    key={notificacao.id ?? `${notificacao.type}-${indice}`}
                  >
                    <div className="notifications__item-head">
                      <h3 className="notifications__type">{rotuloTipo(notificacao.type)}</h3>
                      {dataHora && (
                        <time className="notifications__date" dateTime={notificacao.createdAt}>
                          {dataHora}
                        </time>
                      )}
                    </div>
                    <p className="notifications__description">{notificacao.description}</p>
                  </li>
                )
              })}
            </ul>
          )
        )}
      </section>

      <footer className="notifications__page-footer">Aurora</footer>
    </main>
  )
}
