import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency } from '../../shared/format/currency.js'
import { formatDate } from '../../shared/format/date.js'
import { listExpenses } from '../expenses/api/listExpenses.js'
import './HomeLists.css'

const MAX_DESPESAS = 5

export default function HomeRecentExpenses() {
  const [estado, setEstado] = useState('carregando')
  const [despesas, setDespesas] = useState([])
  const [mensagensErro, setMensagensErro] = useState([])
  const requisicaoAtualRef = useRef(0)

  const carregar = useCallback(() => {
    const id = ++requisicaoAtualRef.current

    setEstado('carregando')
    setMensagensErro([])

    return listExpenses()
      .then((resposta) => {
        if (id !== requisicaoAtualRef.current) return
        const todas = Array.isArray(resposta) ? resposta : []
        setDespesas(todas.slice(0, MAX_DESPESAS))
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
    <section className="home-list" aria-label="Últimos gastos da família">
      <div className="home-list__head">
        <h2 className="home-list__title">Últimos gastos da família</h2>
        <Link className="home-list__link" to="/expenses">
          Ver todos os gastos
        </Link>
      </div>

      {estado === 'carregando' && (
        <p className="home-list__status" aria-live="polite">
          Carregando gastos...
        </p>
      )}

      {estado === 'erro' && (
        <div className="home-list__error" role="alert">
          {mensagensErro.map((mensagem, indice) => (
            <p key={indice}>{mensagem}</p>
          ))}
          <button type="button" className="home-list__retry" onClick={carregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {estado === 'pronto' && (
        despesas.length === 0 ? (
          <p className="home-list__status" aria-live="polite">
            Nenhum gasto registrado.
          </p>
        ) : (
          <ul className="home-list__items">
            {despesas.map((despesa) => (
              <li className="home-list__item" key={despesa.id}>
                <p className="home-list__description">{despesa.description}</p>
                <dl className="home-list__details">
                  <div>
                    <dt>Responsável</dt>
                    <dd>{despesa.userName}</dd>
                  </div>
                  <div>
                    <dt>Data</dt>
                    <dd>{formatDate(despesa.expenseDate)}</dd>
                  </div>
                  <div>
                    <dt>Valor</dt>
                    <dd>{formatCurrency(despesa.amount)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  )
}
