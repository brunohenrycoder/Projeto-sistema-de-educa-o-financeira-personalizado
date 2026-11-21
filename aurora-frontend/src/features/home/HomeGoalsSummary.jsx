import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency } from '../../shared/format/currency.js'
import { listGoals } from '../financialgoals/api/listGoals.js'
import './HomeGoals.css'

const MAX_METAS = 5

function formatarDataHora(valor) {
  const partes = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!partes) return ''

  const [, ano, mes, dia, hora, minuto] = partes
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`
}

export default function HomeGoalsSummary() {
  const [estado, setEstado] = useState('carregando')
  const [metas, setMetas] = useState([])
  const [mensagensErro, setMensagensErro] = useState([])
  const requisicaoAtualRef = useRef(0)

  const carregar = useCallback(() => {
    const id = ++requisicaoAtualRef.current

    setEstado('carregando')
    setMensagensErro([])

    return listGoals()
      .then((resposta) => {
        if (id !== requisicaoAtualRef.current) return
        const todas = Array.isArray(resposta) ? resposta : []
        setMetas(todas.slice(0, MAX_METAS))
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
    <section className="home-goal" aria-label="Metas cadastradas">
      <div className="home-goal__head">
        <h2 className="home-goal__title">Metas cadastradas</h2>
        <Link className="home-goal__link" to="/financial-goals">
          Ver metas financeiras
        </Link>
      </div>

      {estado === 'carregando' && (
        <p className="home-goal__status" aria-live="polite">
          Carregando metas...
        </p>
      )}

      {estado === 'erro' && (
        <div className="home-goal__error" role="alert">
          {mensagensErro.map((mensagem, indice) => (
            <p key={indice}>{mensagem}</p>
          ))}
          <button type="button" className="home-goal__retry" onClick={carregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {estado === 'pronto' && (
        metas.length === 0 ? (
          <p className="home-goal__status" aria-live="polite">
            Nenhuma meta cadastrada.
          </p>
        ) : (
          <ul className="home-goal__items">
            {metas.map((meta) => (
              <li className="home-goal__item" key={meta.id}>
                <span className="home-goal__value">{formatCurrency(meta.targetAmount)}</span>
                <time className="home-goal__date" dateTime={meta.createdAt}>
                  Criada em {formatarDataHora(meta.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  )
}
