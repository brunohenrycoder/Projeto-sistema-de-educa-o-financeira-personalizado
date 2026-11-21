import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessages } from '../../shared/api/errors.js'
import { getFinancialOverview } from '../financialoverview/api/getFinancialOverview.js'
import HomeFinancialSummary from './HomeFinancialSummary.jsx'
import HomeIncomeAlert from './HomeIncomeAlert.jsx'
import HomePeriodFilter from './HomePeriodFilter.jsx'
import './HomeFinancialSection.css'

function mesAtual() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

function mesAnterior(mes) {
  const [ano, numero] = String(mes).split('-').map(Number)
  const anterior = new Date(ano, numero - 2, 1)
  return `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}`
}

function formatarPeriodo(periodo) {
  const partes = String(periodo ?? '').split('-')
  if (partes.length !== 2) return String(periodo ?? '')

  const [ano, mes] = partes
  return `${mes}/${ano}`
}

function semMovimentacoes(resumo) {
  if (!resumo) return true

  return [
    resumo.realizedIncome,
    resumo.plannedIncome,
    resumo.realizedExpenses,
    resumo.plannedExpenses,
    resumo.projectedBalance,
  ].every((valor) => Number(valor) === 0)
}

export default function HomeFinancialSection() {
  const [mesBase] = useState(mesAtual)
  const [opcao, setOpcao] = useState('atual')
  const [estado, setEstado] = useState('carregando')
  const [resumo, setResumo] = useState(null)
  const [mensagensErro, setMensagensErro] = useState([])
  const requisicaoAtualRef = useRef(0)

  const mes = opcao === 'anterior' ? mesAnterior(mesBase) : mesBase

  const carregar = useCallback(() => {
    const id = ++requisicaoAtualRef.current

    setEstado('carregando')
    setMensagensErro([])

    return getFinancialOverview({ month: mes })
      .then((resposta) => {
        if (id !== requisicaoAtualRef.current) return
        setResumo(resposta ?? null)
        setEstado('pronto')
      })
      .catch((erro) => {
        if (id !== requisicaoAtualRef.current) return
        setMensagensErro(getErrorMessages(erro))
        setEstado('erro')
      })
  }, [mes])

  useEffect(() => {
    const timer = setTimeout(carregar, 0)
    return () => {
      clearTimeout(timer)
      requisicaoAtualRef.current += 1
    }
  }, [carregar])

  return (
    <div className="home-finance">
      <HomePeriodFilter opcao={opcao} onChange={setOpcao} />

      {estado === 'carregando' && (
        <p className="home-finance__status" aria-live="polite">
          Carregando resumo financeiro...
        </p>
      )}

      {estado === 'erro' && (
        <div className="home-finance__error" role="alert">
          {mensagensErro.map((mensagem, indice) => (
            <p key={indice}>{mensagem}</p>
          ))}
          <button type="button" className="home-finance__retry" onClick={carregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {estado === 'pronto' && resumo && (
        <>
          {semMovimentacoes(resumo) ? (
            <p className="home-finance__empty" aria-live="polite">
              Nenhuma movimentação financeira encontrada para este mês.
            </p>
          ) : (
            <HomeFinancialSummary
              resumo={resumo}
              periodo={formatarPeriodo(resumo.period)}
            />
          )}

          <HomeIncomeAlert resumo={resumo} />
        </>
      )}
    </div>
  )
}
