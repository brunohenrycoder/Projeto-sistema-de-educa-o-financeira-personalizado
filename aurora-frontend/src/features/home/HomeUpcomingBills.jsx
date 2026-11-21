import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency } from '../../shared/format/currency.js'
import { formatDate } from '../../shared/format/date.js'
import { listPayableBills } from '../payablebills/api/listPayableBills.js'
import './HomeLists.css'

const MAX_CONTAS = 5
const STATUS_RESUMO = ['PENDENTE', 'ATRASADA']
const ROTULOS_STATUS = {
  PENDENTE: 'Pendente',
  ATRASADA: 'Atrasada',
}

export default function HomeUpcomingBills() {
  const [estado, setEstado] = useState('carregando')
  const [contas, setContas] = useState([])
  const [mensagensErro, setMensagensErro] = useState([])
  const requisicaoAtualRef = useRef(0)

  const carregar = useCallback(() => {
    const id = ++requisicaoAtualRef.current

    setEstado('carregando')
    setMensagensErro([])

    return listPayableBills()
      .then((resposta) => {
        if (id !== requisicaoAtualRef.current) return
        const todas = Array.isArray(resposta?.bills) ? resposta.bills : []
        setContas(todas.filter((conta) => STATUS_RESUMO.includes(conta.status)).slice(0, MAX_CONTAS))
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
    <section className="home-list" aria-label="De olho nas contas">
      <div className="home-list__head">
        <h2 className="home-list__title">De olho nas contas</h2>
        <Link className="home-list__link" to="/payable-bills">
          Ver todas as contas
        </Link>
      </div>

      {estado === 'carregando' && (
        <p className="home-list__status" aria-live="polite">
          Carregando contas...
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
        contas.length === 0 ? (
          <p className="home-list__status" aria-live="polite">
            Nenhuma conta pendente encontrada.
          </p>
        ) : (
          <ul className="home-list__items">
            {contas.map((conta) => (
              <li className="home-list__item" key={conta.id}>
                <p className="home-list__description">{conta.description}</p>
                <dl className="home-list__details">
                  <div>
                    <dt>Valor</dt>
                    <dd>{formatCurrency(conta.amount)}</dd>
                  </div>
                  <div>
                    <dt>Vencimento</dt>
                    <dd>{formatDate(conta.dueDate)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd className={`home-list__status-tag home-list__status-tag--${conta.status}`}>
                      {ROTULOS_STATUS[conta.status] ?? conta.status ?? ''}
                    </dd>
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
