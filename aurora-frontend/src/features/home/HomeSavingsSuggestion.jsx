import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency } from '../../shared/format/currency.js'
import { getSavingsSuggestion } from '../financialgoals/api/getSavingsSuggestion.js'
import './HomeGoals.css'

export default function HomeSavingsSuggestion() {
  const [estado, setEstado] = useState('carregando')
  const [sugestao, setSugestao] = useState(null)
  const [mensagensErro, setMensagensErro] = useState([])
  const requisicaoAtualRef = useRef(0)

  const carregar = useCallback(() => {
    const id = ++requisicaoAtualRef.current

    setEstado('carregando')
    setMensagensErro([])

    return getSavingsSuggestion()
      .then((resposta) => {
        if (id !== requisicaoAtualRef.current) return
        setSugestao(resposta?.averageMonthlySurplus ?? null)
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
    <section className="home-goal" aria-label="Sugestão de economia">
      <div className="home-goal__head">
        <h2 className="home-goal__title">Sugestão de economia</h2>
        <Link className="home-goal__link" to="/financial-goals">
          Ver metas financeiras
        </Link>
      </div>

      {estado === 'carregando' && (
        <p className="home-goal__status" aria-live="polite">
          Carregando sugestão de economia...
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
        sugestao == null ? (
          <p className="home-goal__status" aria-live="polite">
            Não há sugestão de economia calculada no momento.
          </p>
        ) : (
          <p className="home-goal__reference">
            Valor de referência para planejamento:
            {' '}
            <strong>{formatCurrency(sugestao)}</strong>
          </p>
        )
      )}
    </section>
  )
}
