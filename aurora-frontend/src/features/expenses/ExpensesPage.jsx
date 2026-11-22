import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeBreadcrumbLink from '../../shared/components/HomeBreadcrumbLink.jsx'
import { getErrorMessages } from '../../shared/api/errors.js'
import { useAuth } from '../../shared/auth/useAuth.js'
import { formatCurrency, parseCurrencyInput } from '../../shared/format/currency.js'
import { formatDate } from '../../shared/format/date.js'
import { listMembers } from '../familymanagement/api/listMembers.js'
import { listExpenses } from './api/listExpenses.js'
import { deleteExpense } from './api/deleteExpense.js'
import { updateExpense } from './api/updateExpense.js'
import './ExpensesPage.css'

const PERIODOS = [
  { id: 'semana', rotulo: 'Esta semana' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes-anterior', rotulo: 'Mês anterior' },
]

const ROTULOS_PAGAMENTO = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO_DEBITO: 'Cartão de débito',
  CARTAO_CREDITO: 'Cartão de crédito',
  TRANSFERENCIA: 'Transferência',
  OUTRO: 'Outro',
}

function paraIso(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function filtroDoPeriodo(periodo) {
  const hoje = new Date()

  if (periodo === 'semana') {
    const inicio = new Date(hoje)
    const diasDesdeSegunda = (inicio.getDay() + 6) % 7
    inicio.setDate(inicio.getDate() - diasDesdeSegunda)
    const fim = new Date(inicio)
    fim.setDate(fim.getDate() + 6)
    return { startDate: paraIso(inicio), endDate: paraIso(fim) }
  }

  if (periodo === 'mes-anterior') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
    return { startDate: paraIso(inicio), endDate: paraIso(fim) }
  }

  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  return { startDate: paraIso(inicio), endDate: paraIso(fim) }
}

function rotuloPeriodo(filtro) {
  if (!filtro.startDate) return ''
  const [ano, mes] = filtro.startDate.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(ano, mes - 1, 1))
}

function rotuloPagamento(valor) {
  return ROTULOS_PAGAMENTO[valor] ?? valor ?? ''
}

function somaDespesas(lista) {
  return lista.reduce((total, despesa) => total + Number(despesa.amount ?? 0), 0)
}

function percentual(parte, total) {
  return total > 0 ? (parte / total) * 100 : 0
}

function validarEdicao({ amount, expenseDate, category, description }) {
  const erros = {}
  const valor = parseCurrencyInput(amount)

  if (!String(amount).trim()) {
    erros.amount = 'Informe o valor da despesa.'
  } else if (valor === null) {
    erros.amount = 'Informe um valor válido com até duas casas decimais.'
  } else if (valor < 0.01) {
    erros.amount = 'O valor da despesa deve ser maior que zero.'
  }

  if (!expenseDate) {
    erros.expenseDate = 'Informe a data da despesa.'
  }

  const categoria = String(category).trim()
  if (!categoria) {
    erros.category = 'Informe a categoria.'
  } else if (categoria.length > 50) {
    erros.category = 'A categoria deve ter no máximo 50 caracteres.'
  }

  if (String(description).length > 255) {
    erros.description = 'A descrição deve ter no máximo 255 caracteres.'
  }

  return erros
}

export default function ExpensesPage() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const ePrincipal = role === 'PRINCIPAL'

  const [periodo, setPeriodo] = useState('mes')
  const [membroId, setMembroId] = useState('')
  const [categoria, setCategoria] = useState('')
  const [estado, setEstado] = useState('carregando')
  const [despesas, setDespesas] = useState([])
  const [membros, setMembros] = useState([])
  const [mensagensErro, setMensagensErro] = useState([])
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState(null)
  const [removendoId, setRemovendoId] = useState(null)
  const [mensagensErroExclusao, setMensagensErroExclusao] = useState([])
  const [mensagemSucessoExclusao, setMensagemSucessoExclusao] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [formEdicao, setFormEdicao] = useState({ amount: '', expenseDate: '', category: '', description: '' })
  const [errosEdicao, setErrosEdicao] = useState({})
  const [mensagensErroEdicao, setMensagensErroEdicao] = useState([])
  const [mensagemSucessoEdicao, setMensagemSucessoEdicao] = useState('')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const salvandoEdicaoRef = useRef(false)
  const removendoRef = useRef(false)
  const requisicaoAtualRef = useRef(0)

  const filtro = useMemo(() => {
    const filtroPeriodo = filtroDoPeriodo(periodo)
    if (ePrincipal && membroId) filtroPeriodo.memberId = membroId
    if (categoria.trim()) filtroPeriodo.category = categoria.trim()
    return filtroPeriodo
  }, [periodo, membroId, categoria, ePrincipal])

  const carregar = useCallback(() => {
    const id = ++requisicaoAtualRef.current

    setEstado('carregando')
    setMensagensErro([])

    return listExpenses(filtro)
      .then((resposta) => {
        if (id !== requisicaoAtualRef.current) return
        setDespesas(Array.isArray(resposta) ? resposta : [])
        setEstado('pronto')
      })
      .catch((erro) => {
        if (id !== requisicaoAtualRef.current) return
        setMensagensErro(getErrorMessages(erro))
        setEstado('erro')
      })
  }, [filtro])

  useEffect(() => {
    const timer = setTimeout(carregar, 0)
    return () => {
      clearTimeout(timer)
      // Invalida requisições em voo assim que o filtro muda, antes mesmo de a
      // próxima consulta ser iniciada pelo timer acima.
      requisicaoAtualRef.current += 1
    }
  }, [carregar])

  useEffect(() => {
    if (!ePrincipal) return undefined

    let ativo = true
    const timer = setTimeout(() => {
      listMembers()
        .then((resposta) => {
          if (ativo) setMembros(Array.isArray(resposta) ? resposta : [])
        })
        .catch(() => {
          if (ativo) setMembros([])
        })
    }, 0)

    return () => {
      ativo = false
      clearTimeout(timer)
    }
  }, [ePrincipal])

  function solicitarExclusao(despesa) {
    setMensagensErroExclusao([])
    setMensagemSucessoExclusao('')
    setMensagemSucessoEdicao('')
    setEditandoId(null)
    setConfirmandoExclusaoId(despesa.id)
  }

  function cancelarExclusao() {
    setConfirmandoExclusaoId(null)
    setMensagensErroExclusao([])
  }

  async function confirmarExclusao(despesa) {
    if (removendoRef.current || !despesa) return

    removendoRef.current = true
    setRemovendoId(despesa.id)
    setMensagensErroExclusao([])
    setMensagemSucessoExclusao('')

    try {
      await deleteExpense(despesa.id)
      setDespesas((anterior) => anterior.filter((item) => item.id !== despesa.id))
      setMensagemSucessoExclusao('Despesa excluída.')
      setConfirmandoExclusaoId(null)
    } catch (erro) {
      setMensagensErroExclusao(getErrorMessages(erro))
    } finally {
      removendoRef.current = false
      setRemovendoId(null)
    }
  }

  function abrirEdicao(despesa) {
    setConfirmandoExclusaoId(null)
    setMensagemSucessoExclusao('')
    setMensagemSucessoEdicao('')
    setMensagensErroEdicao([])
    setErrosEdicao({})
    setEditandoId(despesa.id)
    setFormEdicao({
      amount: formatCurrency(despesa.amount),
      expenseDate: despesa.expenseDate,
      category: despesa.category ?? '',
      description: despesa.description ?? '',
    })
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setErrosEdicao({})
    setMensagensErroEdicao([])
  }

  function atualizarCampoEdicao(evento) {
    const { name, value } = evento.target
    setFormEdicao((anterior) => ({ ...anterior, [name]: value }))
  }

  function formatarValorEdicao() {
    const valor = parseCurrencyInput(formEdicao.amount)
    if (valor !== null && valor > 0) {
      setFormEdicao((anterior) => ({ ...anterior, amount: formatCurrency(valor) }))
    }
  }

  async function handleSalvarEdicao(evento) {
    evento.preventDefault()
    if (salvandoEdicaoRef.current || !editandoId) return

    const errosEncontrados = validarEdicao(formEdicao)
    setErrosEdicao(errosEncontrados)
    setMensagensErroEdicao([])
    if (Object.keys(errosEncontrados).length > 0) return

    salvandoEdicaoRef.current = true
    setSalvandoEdicao(true)

    const descricao = formEdicao.description.trim()
    const payload = {
      amount: parseCurrencyInput(formEdicao.amount),
      expenseDate: formEdicao.expenseDate,
      category: formEdicao.category.trim(),
      ...(descricao ? { description: descricao } : {}),
    }

    try {
      const resposta = await updateExpense(editandoId, payload)
      setDespesas((anterior) => anterior.map((item) => (item.id === editandoId ? resposta : item)))
      setMensagemSucessoEdicao('Despesa atualizada.')
      setMensagemSucessoExclusao('')
      setEditandoId(null)
    } catch (erro) {
      setMensagensErroEdicao(getErrorMessages(erro))
    } finally {
      salvandoEdicaoRef.current = false
      setSalvandoEdicao(false)
    }
  }

  const despesaSelecionada = despesas.find((despesa) => despesa.id === confirmandoExclusaoId)
  const despesaEmEdicao = despesas.find((despesa) => despesa.id === editandoId)

  const totalGeral = useMemo(() => somaDespesas(despesas), [despesas])
  const resumo = useMemo(() => {
    const doPrincipal = despesas.filter((despesa) => despesa.userRole === 'PRINCIPAL')
    const doDependente = despesas.filter((despesa) => despesa.userRole === 'DEPENDENTE')

    return {
      principal: { total: somaDespesas(doPrincipal), quantidade: doPrincipal.length },
      dependente: { total: somaDespesas(doDependente), quantidade: doDependente.length },
    }
  }, [despesas])

  const rotuloDoPeriodo = rotuloPeriodo(filtro)

  return (
    <main className="container expenses">
      <nav className="expenses__breadcrumb" aria-label="Trilha de navegação">
        <HomeBreadcrumbLink />
        <span aria-hidden="true">/</span>
        <span aria-current="page">Gastos da família</span>
      </nav>

      <header className="expenses__hero">
        <div className="expenses__intro">
          <p className="expenses__eyebrow">
            <span className="expenses__eyebrow-label">Organização</span>
            <span aria-hidden="true">·</span>
            <span>{rotuloDoPeriodo}</span>
          </p>
          <h1 className="expenses__title">Cada gasto, uma visão mais clara.</h1>
          <p className="expenses__subtitle">
            Veja os registros realizados e quem participou de cada despesa.
          </p>
        </div>
        <button
          className="expenses__register"
          type="button"
          onClick={() => navigate('/expenses/new')}
        >
          Registrar despesa
        </button>
      </header>

      <section className="expenses__filters" aria-label="Filtros de despesas">
        <div className="expenses__filter">
          <span className="expenses__filter-label">Período</span>
          <div className="expenses__periodos" role="group" aria-label="Período">
            {PERIODOS.map((opcao) => (
              <button
                key={opcao.id}
                type="button"
                aria-pressed={periodo === opcao.id}
                onClick={() => setPeriodo(opcao.id)}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="expenses__filter">
          <label className="expenses__filter-label" htmlFor="expenses-categoria">
            Categoria
          </label>
          <div className="expenses__filtro-categoria">
            <input
              id="expenses-categoria"
              name="categoria"
              type="text"
              value={categoria}
              onChange={(evento) => setCategoria(evento.target.value)}
              placeholder="Todas as categorias"
            />
            {categoria && (
              <button
                type="button"
                className="expenses__limpar-categoria"
                onClick={() => setCategoria('')}
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {ePrincipal && (
          <div className="expenses__filter">
            <label className="expenses__filter-label" htmlFor="expenses-membro">
              Membro
            </label>
            <select
              id="expenses-membro"
              value={membroId}
              onChange={(evento) => setMembroId(evento.target.value)}
            >
              <option value="">Todos os membros</option>
              {membros.map((membro) => (
                <option key={membro.id} value={membro.id}>
                  {membro.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {estado === 'carregando' && (
        <p className="expenses__loading" role="status">
          Carregando despesas...
        </p>
      )}

      {estado === 'erro' && (
        <div className="expenses__error" role="alert">
          {mensagensErro.map((mensagem, indice) => (
            <p key={indice}>{mensagem}</p>
          ))}
        </div>
      )}

      {estado === 'pronto' && (
        <>
          {mensagemSucessoExclusao && (
            <p className="expenses__success" role="status">
              {mensagemSucessoExclusao}
            </p>
          )}

          {mensagemSucessoEdicao && (
            <p className="expenses__success" role="status">
              {mensagemSucessoEdicao}
            </p>
          )}

          {ePrincipal && (
            <section className="expenses__summary" aria-label="Resumo de gastos">
              <article className="expenses__summary-card expenses__summary-card--destaque">
                <p className="expenses__summary-label">Gastos realizados por todos os membros</p>
                <p className="expenses__summary-value" data-testid="total-geral">
                  {formatCurrency(totalGeral)}
                </p>
              </article>

              <article className="expenses__summary-card">
                <p className="expenses__summary-label">Principal</p>
                <p className="expenses__summary-value">{formatCurrency(resumo.principal.total)}</p>
                <p className="expenses__summary-detail">
                  {resumo.principal.quantidade} registros · {percentual(resumo.principal.total, totalGeral).toFixed(0)}%
                </p>
              </article>

              <article className="expenses__summary-card">
                <p className="expenses__summary-label">Dependente</p>
                <p className="expenses__summary-value">{formatCurrency(resumo.dependente.total)}</p>
                <p className="expenses__summary-detail">
                  {resumo.dependente.quantidade} registros · {percentual(resumo.dependente.total, totalGeral).toFixed(0)}%
                </p>
              </article>
            </section>
          )}

          <section className="expenses__table-card">
            <h2 className="expenses__table-title">Gastos de {rotuloDoPeriodo}</h2>

            {despesas.length === 0 ? (
              <p className="expenses__empty">Nenhuma despesa registrada no período selecionado.</p>
            ) : (
              <>
                <div className="expenses__table-scroll">
                  <table className="expenses__table" data-testid="expenses-tabela">
                    <thead>
                      <tr>
                        <th scope="col">Descrição</th>
                        <th scope="col" className="expenses__cell--amount">Valor</th>
                        <th scope="col">Data</th>
                        <th scope="col">Categoria</th>
                        <th scope="col">Pagamento</th>
                        <th scope="col">Autor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {despesas.map((despesa) => (
                        <tr key={despesa.id}>
                          <td>{despesa.description || '—'}</td>
                          <td className="expenses__cell--amount">{formatCurrency(despesa.amount)}</td>
                          <td>{formatDate(despesa.expenseDate)}</td>
                          <td>{despesa.category}</td>
                          <td>{rotuloPagamento(despesa.paymentMethod)}</td>
                          <td>
                            <div className="expenses__cell-with-action">
                              <span>{despesa.userName}</span>
                              <div className="expenses__row-actions">
                                <button
                                  type="button"
                                  className="expenses__edit-button"
                                  onClick={() => abrirEdicao(despesa)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="expenses__delete-button"
                                  onClick={() => solicitarExclusao(despesa)}
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="expenses__mobile-list" data-testid="expenses-cards">
                  {despesas.map((despesa) => (
                    <li className="expenses__expense-card" key={despesa.id}>
                      <p className="expenses__card-description">{despesa.description || '—'}</p>
                      <p className="expenses__card-value">{formatCurrency(despesa.amount)}</p>
                      <dl className="expenses__card-details">
                        <dt>Data</dt>
                        <dd>{formatDate(despesa.expenseDate)}</dd>
                        <dt>Categoria</dt>
                        <dd>{despesa.category}</dd>
                        <dt>Pagamento</dt>
                        <dd>{rotuloPagamento(despesa.paymentMethod)}</dd>
                        <dt>Autor</dt>
                        <dd>{despesa.userName}</dd>
                      </dl>
                      <div className="expenses__row-actions">
                        <button
                          type="button"
                          className="expenses__edit-button expenses__edit-button--card"
                          onClick={() => abrirEdicao(despesa)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="expenses__delete-button expenses__delete-button--card"
                          onClick={() => solicitarExclusao(despesa)}
                        >
                          Excluir
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="expenses__table-footer">
                  <span>{despesas.length} registros</span>
                  {ePrincipal && <span>Total: {formatCurrency(totalGeral)}</span>}
                </div>
              </>
            )}
          </section>

          {despesaEmEdicao && (
            <section className="expenses__edit-form" aria-label="Editar despesa">
              <h3 className="expenses__edit-title">Editar despesa</h3>

              <form onSubmit={handleSalvarEdicao} noValidate>
                <div className="expenses__field">
                  <label htmlFor="edicao-amount">Valor</label>
                  <input
                    id="edicao-amount"
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    value={formEdicao.amount}
                    onChange={atualizarCampoEdicao}
                    onBlur={formatarValorEdicao}
                    aria-invalid={Boolean(errosEdicao.amount)}
                    aria-describedby={errosEdicao.amount ? 'edicao-erro-amount' : undefined}
                  />
                  {errosEdicao.amount && (
                    <p className="expenses__field-error" id="edicao-erro-amount" role="alert">
                      {errosEdicao.amount}
                    </p>
                  )}
                </div>

                <div className="expenses__field">
                  <label htmlFor="edicao-date">Data da despesa</label>
                  <input
                    id="edicao-date"
                    name="expenseDate"
                    type="date"
                    value={formEdicao.expenseDate}
                    onChange={atualizarCampoEdicao}
                    aria-invalid={Boolean(errosEdicao.expenseDate)}
                    aria-describedby={errosEdicao.expenseDate ? 'edicao-erro-date' : undefined}
                  />
                  {errosEdicao.expenseDate && (
                    <p className="expenses__field-error" id="edicao-erro-date" role="alert">
                      {errosEdicao.expenseDate}
                    </p>
                  )}
                </div>

                <div className="expenses__field">
                  <label htmlFor="edicao-category">Categoria</label>
                  <input
                    id="edicao-category"
                    name="category"
                    type="text"
                    value={formEdicao.category}
                    onChange={atualizarCampoEdicao}
                    aria-invalid={Boolean(errosEdicao.category)}
                    aria-describedby={errosEdicao.category ? 'edicao-erro-category' : undefined}
                  />
                  {errosEdicao.category && (
                    <p className="expenses__field-error" id="edicao-erro-category" role="alert">
                      {errosEdicao.category}
                    </p>
                  )}
                </div>

                <div className="expenses__field">
                  <span className="expenses__field-label">Forma de pagamento</span>
                  <p className="expenses__field-readonly">
                    {rotuloPagamento(despesaEmEdicao.paymentMethod)}
                  </p>
                </div>

                <div className="expenses__field">
                  <label htmlFor="edicao-description">Descrição</label>
                  <input
                    id="edicao-description"
                    name="description"
                    type="text"
                    value={formEdicao.description}
                    onChange={atualizarCampoEdicao}
                    aria-invalid={Boolean(errosEdicao.description)}
                    aria-describedby={errosEdicao.description ? 'edicao-erro-description' : undefined}
                  />
                  {errosEdicao.description && (
                    <p className="expenses__field-error" id="edicao-erro-description" role="alert">
                      {errosEdicao.description}
                    </p>
                  )}
                </div>

                {mensagensErroEdicao.length > 0 && (
                  <div className="expenses__error" role="alert">
                    {mensagensErroEdicao.map((mensagem, indice) => (
                      <p key={indice}>{mensagem}</p>
                    ))}
                  </div>
                )}

                <div className="expenses__confirm-actions">
                  <button
                    type="submit"
                    className="expenses__confirm-delete"
                    disabled={salvandoEdicao}
                  >
                    {salvandoEdicao ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    className="expenses__confirm-cancel"
                    onClick={cancelarEdicao}
                    disabled={salvandoEdicao}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          )}

          {despesaSelecionada && (
            <div
              className="expenses__confirm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="expenses-confirm-title"
            >
              <p className="expenses__confirm-title" id="expenses-confirm-title">
                Excluir despesa?
              </p>
              <p className="expenses__confirm-text">
                A despesa selecionada será excluída.
              </p>
              <p className="expenses__confirm-detail">
                {despesaSelecionada.description || '—'} · {formatCurrency(despesaSelecionada.amount)} · {formatDate(despesaSelecionada.expenseDate)}
              </p>

              {mensagensErroExclusao.length > 0 && (
                <div className="expenses__error" role="alert">
                  {mensagensErroExclusao.map((mensagem, indice) => (
                    <p key={indice}>{mensagem}</p>
                  ))}
                </div>
              )}

              <div className="expenses__confirm-actions">
                <button
                  type="button"
                  className="expenses__confirm-delete"
                  onClick={() => confirmarExclusao(despesaSelecionada)}
                  disabled={removendoId !== null}
                >
                  {removendoId !== null ? 'Excluindo...' : 'Confirmar exclusão'}
                </button>
                <button
                  type="button"
                  className="expenses__confirm-cancel"
                  onClick={cancelarExclusao}
                  disabled={removendoId !== null}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <p className="expenses__note">
            Despesas pagas com cartão de crédito compõem a fatura em aberto correspondente.
          </p>
        </>
      )}

      <footer className="expenses__page-footer">Aurora</footer>
    </main>
  )
}
