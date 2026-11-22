import { useCallback, useEffect, useRef, useState } from 'react'
import HomeBreadcrumbLink from '../../shared/components/HomeBreadcrumbLink.jsx'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency } from '../../shared/format/currency.js'
import { getFinancialOverview } from './api/getFinancialOverview.js'
import './FinancialOverviewPage.css'

function mesAtual() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

function formatarPeriodo(periodo) {
  const texto = String(periodo ?? '')
  const partes = texto.split('-')
  if (partes.length !== 2) return texto

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

function formatarPercentual(valor) {
  if (valor == null) return ''
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return ''
  return `${numero.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

function formatarDataHora(valor) {
  const texto = String(valor ?? '')
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!partes) return texto

  const [, ano, mes, dia, hora, minuto] = partes
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`
}

export default function FinancialOverviewPage() {
  const [estado, setEstado] = useState('carregando')
  const [resumo, setResumo] = useState(null)
  const [mensagensErro, setMensagensErro] = useState([])
  const [mes, setMes] = useState(mesAtual)
  const requisicaoAtualRef = useRef(0)

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

  function aoAlterarMes(evento) {
    setMes(evento.target.value)
  }

  const exibirIndicador = Boolean(resumo && resumo.commitmentPercent != null)

  return (
    <main className="container financial-overview">
      <nav className="financial-overview__breadcrumb" aria-label="Trilha de navegação">
        <HomeBreadcrumbLink />
        <span aria-hidden="true">/</span>
        <span aria-current="page">Visão financeira</span>
      </nav>

      <header className="financial-overview__hero">
        <div className="financial-overview__intro">
          <p className="financial-overview__eyebrow">Saúde financeira da família</p>
          <h1 className="financial-overview__title">Visão financeira</h1>
          <p className="financial-overview__subtitle">
            Acompanhe as entradas, saídas e o saldo projetado do grupo familiar.
          </p>
        </div>
      </header>

      <section className="financial-overview__filter" aria-label="Filtro de período">
        <label htmlFor="financial-overview-month">Mês de referência</label>
        <input
          id="financial-overview-month"
          type="month"
          value={mes}
          onChange={aoAlterarMes}
        />
      </section>

      {estado === 'carregando' && (
        <p className="financial-overview__status" role="status">
          Carregando visão financeira...
        </p>
      )}

      {estado === 'erro' && (
        <div className="financial-overview__error" role="alert">
          {mensagensErro.map((mensagem, indice) => (
            <p key={indice}>{mensagem}</p>
          ))}
          <button type="button" className="financial-overview__retry" onClick={carregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {estado === 'pronto' && resumo && (
        <section className="financial-overview__card" aria-label="Resumo financeiro">
          <div className="financial-overview__card-head">
            <h2 className="financial-overview__card-title">Resumo financeiro</h2>
            <p className="financial-overview__period">
              Período: {formatarPeriodo(resumo.period)}
            </p>
          </div>

          {semMovimentacoes(resumo) ? (
            <p className="financial-overview__empty" role="status">
              Nenhuma movimentação financeira encontrada para este mês.
            </p>
          ) : (
            <>
              <div className="financial-overview__metrics">
                <div className="financial-overview__metric">
                  <span className="financial-overview__metric-label">Entradas realizadas</span>
                  <span className="financial-overview__metric-value">
                    {formatCurrency(resumo.realizedIncome)}
                  </span>
                </div>
                <div className="financial-overview__metric">
                  <span className="financial-overview__metric-label">Entradas previstas</span>
                  <span className="financial-overview__metric-value">
                    {formatCurrency(resumo.plannedIncome)}
                  </span>
                </div>
                <div className="financial-overview__metric">
                  <span className="financial-overview__metric-label">Saídas realizadas</span>
                  <span className="financial-overview__metric-value">
                    {formatCurrency(resumo.realizedExpenses)}
                  </span>
                </div>
                <div className="financial-overview__metric">
                  <span className="financial-overview__metric-label">Saídas previstas</span>
                  <span className="financial-overview__metric-value">
                    {formatCurrency(resumo.plannedExpenses)}
                  </span>
                </div>
              </div>

              <div className="financial-overview__balance">
                <span className="financial-overview__balance-label">Saldo projetado</span>
                <strong className="financial-overview__balance-value">
                  {formatCurrency(resumo.projectedBalance)}
                </strong>
              </div>
            </>
          )}

          <section className="financial-overview__comparison" aria-label="Renda e despesas consideradas">
            <h3 className="financial-overview__section-title">Renda e despesas consideradas</h3>

            <dl className="financial-overview__comparison-values">
              <div>
                <dt>Renda considerada</dt>
                <dd>{formatCurrency(resumo.incomeConsidered)}</dd>
              </div>
              <div>
                <dt>Despesas consideradas</dt>
                <dd>{formatCurrency(resumo.expensesConsidered)}</dd>
              </div>
            </dl>

            {exibirIndicador && (
              <div className="financial-overview__commitment">
                <div className="financial-overview__commitment-head">
                  <span className="financial-overview__commitment-label">
                    Comprometimento da renda
                  </span>
                  <strong className="financial-overview__commitment-value">
                    {formatarPercentual(resumo.commitmentPercent)}
                  </strong>
                </div>

                <progress
                  className={`financial-overview__progress${resumo.thresholdReached ? ' financial-overview__progress--reached' : ''}`}
                  value={Number(resumo.commitmentPercent)}
                  max="100"
                  aria-label="Percentual de comprometimento da renda"
                />

                <p
                  className={`financial-overview__threshold financial-overview__threshold--${resumo.thresholdReached ? 'reached' : 'normal'}`}
                  role="status"
                  data-threshold-reached={resumo.thresholdReached ? 'true' : 'false'}
                >
                  {resumo.thresholdReached
                    ? `Limite de ${formatarPercentual(resumo.alertThresholdPercent)} atingido`
                    : `Dentro do limite de ${formatarPercentual(resumo.alertThresholdPercent)}`}
                </p>
              </div>
            )}

            {exibirIndicador && resumo.alert && (
              <section className="financial-overview__alert" aria-label="Alerta financeiro">
                <h3 className="financial-overview__alert-title">Alerta financeiro</h3>
                <p className="financial-overview__alert-text">
                  O comprometimento da renda atingiu {formatarPercentual(resumo.alert.commitmentPercent)}.
                </p>
                <dl className="financial-overview__alert-details">
                  <dt>Mês de referência</dt>
                  <dd>{formatarPeriodo(resumo.alert.referenceMonth)}</dd>
                  <dt>Limite</dt>
                  <dd>{formatarPercentual(resumo.alert.thresholdPercent)}</dd>
                  <dt>Registrado em</dt>
                  <dd>{formatarDataHora(resumo.alert.createdAt)}</dd>
                </dl>
              </section>
            )}
          </section>
        </section>
      )}

      <footer className="financial-overview__page-footer">Aurora</footer>
    </main>
  )
}
