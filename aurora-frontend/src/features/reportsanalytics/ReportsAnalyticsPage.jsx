import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HomeBreadcrumbLink from '../../shared/components/HomeBreadcrumbLink.jsx'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency } from '../../shared/format/currency.js'
import { toApiMonth } from '../../shared/format/date.js'
import { listMembers } from '../familymanagement/api/listMembers.js'
import { getExpensesByCategory } from './api/getExpensesByCategory.js'
import { getExpensesByMember } from './api/getExpensesByMember.js'
import { getSpendingPatterns } from './api/getSpendingPatterns.js'
import { getCategoryVariations } from './api/getCategoryVariations.js'
import './ReportsAnalyticsPage.css'

const FILTROS_INICIAIS = {
  startDate: '',
  endDate: '',
  category: '',
  memberId: '',
}

function mesDeReferencia(startDate, endDate) {
  const mes = toApiMonth(startDate) || toApiMonth(endDate)
  if (mes) return mes

  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
}

function formatarPeriodo(periodo) {
  const partes = String(periodo ?? '').split('-')
  if (partes.length !== 2) return String(periodo ?? '')
  return `${partes[1]}/${partes[0]}`
}

function formatarPercentual(valor) {
  if (valor == null) return ''
  return `${Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

export default function ReportsAnalyticsPage() {
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [estado, setEstado] = useState('carregando')
  const [porCategoria, setPorCategoria] = useState([])
  const [porIntegrante, setPorIntegrante] = useState([])
  const [mensagensErro, setMensagensErro] = useState([])
  const [erroPeriodo, setErroPeriodo] = useState('')
  const [membros, setMembros] = useState([])
  const requisicaoAtualRef = useRef(0)

  const [estadoPadroes, setEstadoPadroes] = useState('carregando')
  const [padroes, setPadroes] = useState(null)
  const [mensagensErroPadroes, setMensagensErroPadroes] = useState([])
  const padroesReqRef = useRef(0)

  const [estadoVariacoes, setEstadoVariacoes] = useState('carregando')
  const [variacoes, setVariacoes] = useState(null)
  const [mensagensErroVariacoes, setMensagensErroVariacoes] = useState([])
  const variacoesReqRef = useRef(0)

  const periodoInvalido = Boolean(
    filtros.startDate && filtros.endDate && filtros.startDate > filtros.endDate,
  )
  const mes = useMemo(
    () => mesDeReferencia(filtros.startDate, filtros.endDate),
    [filtros.startDate, filtros.endDate],
  )

  const carregar = useCallback(() => {
    if (periodoInvalido) {
      setErroPeriodo('A data inicial não pode ser posterior à data final.')
      setPorCategoria([])
      setPorIntegrante([])
      setEstado('pronto')
      return
    }

    const id = ++requisicaoAtualRef.current

    setErroPeriodo('')
    setEstado('carregando')
    setMensagensErro([])

    return Promise.all([
      getExpensesByCategory(filtros),
      getExpensesByMember(filtros),
    ])
      .then(([categorias, integrantes]) => {
        if (id !== requisicaoAtualRef.current) return
        setPorCategoria(Array.isArray(categorias) ? categorias : [])
        setPorIntegrante(Array.isArray(integrantes) ? integrantes : [])
        setEstado('pronto')
      })
      .catch((erro) => {
        if (id !== requisicaoAtualRef.current) return
        setMensagensErro(getErrorMessages(erro))
        setEstado('erro')
      })
  }, [filtros, periodoInvalido])

  const carregarPadroes = useCallback(() => {
    if (periodoInvalido) return undefined

    const id = ++padroesReqRef.current

    setEstadoPadroes('carregando')
    setMensagensErroPadroes([])

    return getSpendingPatterns({
      month: mes,
      category: filtros.category,
      memberId: filtros.memberId,
    })
      .then((resposta) => {
        if (id !== padroesReqRef.current) return
        setPadroes(resposta ?? null)
        setEstadoPadroes('pronto')
      })
      .catch((erro) => {
        if (id !== padroesReqRef.current) return
        setMensagensErroPadroes(getErrorMessages(erro))
        setEstadoPadroes('erro')
      })
  }, [filtros.category, filtros.memberId, mes, periodoInvalido])

  const carregarVariacoes = useCallback(() => {
    if (periodoInvalido) return undefined

    const id = ++variacoesReqRef.current

    setEstadoVariacoes('carregando')
    setMensagensErroVariacoes([])

    return getCategoryVariations({
      month: mes,
      category: filtros.category,
      memberId: filtros.memberId,
    })
      .then((resposta) => {
        if (id !== variacoesReqRef.current) return
        setVariacoes(resposta ?? null)
        setEstadoVariacoes('pronto')
      })
      .catch((erro) => {
        if (id !== variacoesReqRef.current) return
        setMensagensErroVariacoes(getErrorMessages(erro))
        setEstadoVariacoes('erro')
      })
  }, [filtros.category, filtros.memberId, mes, periodoInvalido])

  useEffect(() => {
    const timer = setTimeout(carregarVariacoes, 0)
    return () => {
      clearTimeout(timer)
      variacoesReqRef.current += 1
    }
  }, [carregarVariacoes])

  useEffect(() => {
    const timer = setTimeout(carregarPadroes, 0)
    return () => {
      clearTimeout(timer)
      padroesReqRef.current += 1
    }
  }, [carregarPadroes])

  useEffect(() => {
    const timer = setTimeout(carregar, 0)
    return () => {
      clearTimeout(timer)
      requisicaoAtualRef.current += 1
    }
  }, [carregar])

  useEffect(() => {
    let ativo = true
    listMembers()
      .then((resposta) => {
        if (ativo) setMembros(Array.isArray(resposta) ? resposta : [])
      })
      .catch(() => {
        if (ativo) setMembros([])
      })
    return () => {
      ativo = false
    }
  }, [])

  function aoAlterarFiltro(evento) {
    const { name, value } = evento.target
    setFiltros((anterior) => ({ ...anterior, [name]: value }))
  }

  return (
    <main className="container reports">
      <nav className="reports__breadcrumb" aria-label="Trilha de navegação">
        <HomeBreadcrumbLink />
        <span aria-hidden="true">/</span>
        <span aria-current="page">Relatórios de gastos</span>
      </nav>

      <header className="reports__hero">
        <div className="reports__intro">
          <p className="reports__eyebrow">Análise e hábitos financeiros</p>
          <h1 className="reports__title">Relatórios de gastos</h1>
          <p className="reports__subtitle">
            Veja para onde foi o dinheiro da família por categoria e por integrante.
          </p>
        </div>
      </header>

      <section className="reports__filters" aria-label="Filtros dos relatórios">
        <div className="reports__field">
          <label htmlFor="reports-startDate">Período inicial</label>
          <input
            id="reports-startDate"
            name="startDate"
            type="date"
            value={filtros.startDate}
            onChange={aoAlterarFiltro}
          />
        </div>

        <div className="reports__field">
          <label htmlFor="reports-endDate">Período final</label>
          <input
            id="reports-endDate"
            name="endDate"
            type="date"
            value={filtros.endDate}
            onChange={aoAlterarFiltro}
          />
        </div>

        <div className="reports__field">
          <label htmlFor="reports-category">Categoria</label>
          <input
            id="reports-category"
            name="category"
            type="text"
            maxLength={50}
            placeholder="Todas as categorias"
            value={filtros.category}
            onChange={aoAlterarFiltro}
          />
        </div>

        <div className="reports__field">
          <label htmlFor="reports-memberId">Integrante</label>
          <select
            id="reports-memberId"
            name="memberId"
            value={filtros.memberId}
            onChange={aoAlterarFiltro}
          >
            <option value="">Todos os integrantes</option>
            {membros.map((membro) => (
              <option key={membro.id} value={membro.id}>{membro.name}</option>
            ))}
          </select>
        </div>
      </section>

      {erroPeriodo && (
        <p className="reports__validation" role="alert">{erroPeriodo}</p>
      )}

      {estado === 'carregando' && (
        <p className="reports__status" role="status">Carregando relatórios...</p>
      )}

      {estado === 'erro' && (
        <div className="reports__error" role="alert">
          {mensagensErro.map((mensagem, indice) => (
            <p key={indice}>{mensagem}</p>
          ))}
          <button type="button" className="reports__retry" onClick={carregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {estado === 'pronto' && !erroPeriodo && (
        <>
          <section className="reports__section" aria-label="Gastos por categoria">
            <h2 className="reports__section-title">Por categoria</h2>
            {porCategoria.length === 0 ? (
              <p className="reports__empty">Nenhum gasto encontrado por categoria.</p>
            ) : (
              <>
                <div className="reports__table-scroll">
                  <table className="reports__table" data-testid="reports-categoria-tabela">
                    <thead>
                      <tr>
                        <th scope="col">Categoria</th>
                        <th scope="col" className="reports__cell--amount">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {porCategoria.map((item) => (
                        <tr key={item.category}>
                          <td>{item.category}</td>
                          <td className="reports__cell--amount">
                            {formatCurrency(item.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="reports__mobile-list" data-testid="reports-categoria-cards">
                  {porCategoria.map((item) => (
                    <li className="reports__item" key={item.category}>
                      <span className="reports__item-label">{item.category}</span>
                      <span className="reports__item-value">
                        {formatCurrency(item.totalAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="reports__section" aria-label="Gastos por integrante">
            <h2 className="reports__section-title">Por integrante</h2>
            {porIntegrante.length === 0 ? (
              <p className="reports__empty">Nenhum gasto encontrado por integrante.</p>
            ) : (
              <>
                <div className="reports__table-scroll">
                  <table className="reports__table" data-testid="reports-integrante-tabela">
                    <thead>
                      <tr>
                        <th scope="col">Integrante</th>
                        <th scope="col" className="reports__cell--amount">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {porIntegrante.map((item) => (
                        <tr key={item.memberId}>
                          <td>{item.memberName}</td>
                          <td className="reports__cell--amount">
                            {formatCurrency(item.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="reports__mobile-list" data-testid="reports-integrante-cards">
                  {porIntegrante.map((item) => (
                    <li className="reports__item" key={item.memberId}>
                      <span className="reports__item-label">{item.memberName}</span>
                      <span className="reports__item-value">
                        {formatCurrency(item.totalAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}

      <section className="reports__section" aria-label="Análise de padrões de consumo">
            <div className="reports__patterns-head">
              <h2 className="reports__section-title">Padrões de consumo</h2>
              {estadoPadroes === 'pronto' && padroes?.analysisAvailable && (
                <p className="reports__patterns-meta">
                  Período {formatarPeriodo(padroes.period)} · {padroes.historyMonthsUsed}
                  {' '}
                  {padroes.historyMonthsUsed === 1 ? 'mês de histórico' : 'meses de histórico'}
                </p>
              )}
            </div>

            {estadoPadroes === 'carregando' && (
              <p className="reports__status" role="status">Carregando análise de padrões...</p>
            )}

            {estadoPadroes === 'erro' && (
              <div className="reports__error" role="alert">
                {mensagensErroPadroes.map((mensagem, indice) => (
                  <p key={indice}>{mensagem}</p>
                ))}
                <button type="button" className="reports__retry" onClick={carregarPadroes}>
                  Tentar novamente
                </button>
              </div>
            )}

            {estadoPadroes === 'pronto' && (
              !padroes || !padroes.analysisAvailable ? (
                <p className="reports__empty">
                  São necessários pelo menos 2 meses de histórico para identificar padrões de consumo.
                </p>
              ) : !Array.isArray(padroes.topCategories) || padroes.topCategories.length === 0 ? (
                <p className="reports__empty">Nenhuma categoria disponível para análise neste período.</p>
              ) : (
                <ul className="reports__patterns-list" data-testid="reports-padroes-lista">
                  {padroes.topCategories.map((item) => (
                    <li className="reports__pattern-item" key={item.category}>
                      <p className="reports__pattern-category">{item.category}</p>
                      <dl className="reports__pattern-details">
                        <dt>Valor no período</dt>
                        <dd>{formatCurrency(item.currentAmount)}</dd>
                        <dt>Média histórica</dt>
                        <dd>{formatCurrency(item.historicalAverage)}</dd>
                        {item.variationPercent != null && (
                          <>
                            <dt>Variação</dt>
                            <dd>{formatarPercentual(item.variationPercent)}</dd>
                          </>
                        )}
                      </dl>
                    </li>
                  ))}
                </ul>
              )
            )}
      </section>

      <section className="reports__section" aria-label="Categorias com aumento de gastos">
        <div className="reports__patterns-head">
          <h2 className="reports__section-title">Categorias com aumento de gastos</h2>
          {estadoVariacoes === 'pronto' && variacoes?.analysisAvailable && (
            <p className="reports__patterns-meta">
              Período {formatarPeriodo(variacoes.period)} · {variacoes.historyMonthsUsed}
              {' '}
              {variacoes.historyMonthsUsed === 1 ? 'mês de histórico' : 'meses de histórico'}
            </p>
          )}
        </div>

        {estadoVariacoes === 'carregando' && (
          <p className="reports__status" role="status">Carregando variações de gastos...</p>
        )}

        {estadoVariacoes === 'erro' && (
          <div className="reports__error" role="alert">
            {mensagensErroVariacoes.map((mensagem, indice) => (
              <p key={indice}>{mensagem}</p>
            ))}
            <button type="button" className="reports__retry" onClick={carregarVariacoes}>
              Tentar novamente
            </button>
          </div>
        )}

        {estadoVariacoes === 'pronto' && (
          !variacoes || !variacoes.analysisAvailable ? (
            <p className="reports__empty">
              São necessários pelo menos 2 meses de histórico para identificar variações de gastos.
            </p>
          ) : !Array.isArray(variacoes.variations) || variacoes.variations.length === 0 ? (
            <p className="reports__empty">
              Nenhuma categoria com aumento superior a 20% neste período.
            </p>
          ) : (
            <ul className="reports__patterns-list" data-testid="reports-variacoes-lista">
              {variacoes.variations.map((item) => (
                <li className="reports__pattern-item" key={item.category}>
                  <p className="reports__pattern-category">{item.category}</p>
                  <dl className="reports__pattern-details">
                    <dt>Valor no período</dt>
                    <dd>{formatCurrency(item.currentAmount)}</dd>
                    <dt>Média histórica</dt>
                    <dd>{formatCurrency(item.historicalAverage)}</dd>
                    {item.variationPercent != null && (
                      <>
                        <dt>Variação</dt>
                        <dd>{formatarPercentual(item.variationPercent)}</dd>
                      </>
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </main>
  )
}
