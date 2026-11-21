import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import HomeBreadcrumbLink from '../../shared/components/HomeBreadcrumbLink.jsx'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency, parseCurrencyInput } from '../../shared/format/currency.js'
import { formatDate } from '../../shared/format/date.js'
import { getCreditCardInvoice } from './api/getCreditCardInvoice.js'
import { registerCreditCardPayment } from './api/registerCreditCardPayment.js'
import { registerCreditCardRefund } from './api/registerCreditCardRefund.js'
import './CreditCardsPage.css'
import './CreditCardInvoicePage.css'

const ROTULOS_STATUS = {
  OPEN: 'Aberta',
  CLOSED: 'Fechada',
  PARTIALLY_PAID: 'Parcialmente paga',
  PAID: 'Paga',
  OVERDUE: 'Vencida',
}

function rotuloStatus(status) {
  return ROTULOS_STATUS[status] ?? status ?? ''
}

function formatarDataHora(valor) {
  const texto = String(valor ?? '')
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!partes) return formatDate(texto)

  const [, ano, mes, dia, hora, minuto] = partes
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`
}

function listaOuVazio(itens) {
  return Array.isArray(itens) ? itens : []
}

function validarPagamento(valor, saldoPendente) {
  const numero = parseCurrencyInput(valor)

  if (!String(valor).trim()) return 'Informe o valor do pagamento.'
  if (numero === null) return 'Informe um valor válido com até duas casas decimais.'
  if (numero <= 0) return 'O valor do pagamento deve ser maior que zero.'
  if (Math.floor(numero).toString().length > 10) return 'O pagamento deve ter no máximo 10 dígitos inteiros.'
  if (numero > Number(saldoPendente)) return 'O pagamento não pode ultrapassar o saldo pendente da fatura.'
  return ''
}

function validarEstorno(valor) {
  const numero = parseCurrencyInput(valor)

  if (!String(valor).trim()) return 'Informe o valor do estorno.'
  if (numero === null) return 'Informe um valor válido com até duas casas decimais.'
  if (numero <= 0) return 'O valor do estorno deve ser maior que zero.'
  if (Math.floor(numero).toString().length > 10) return 'O estorno deve ter no máximo 10 dígitos inteiros.'
  return ''
}

export default function CreditCardInvoicePage() {
  const { invoiceId } = useParams()
  const [estado, setEstado] = useState('carregando')
  const [fatura, setFatura] = useState(null)
  const [mensagensErro, setMensagensErro] = useState([])
  const requisicaoAtualRef = useRef(0)

  const [pagamentoAberto, setPagamentoAberto] = useState(false)
  const [valorPagamento, setValorPagamento] = useState('')
  const [erroValorPagamento, setErroValorPagamento] = useState('')
  const [mensagensErroPagamento, setMensagensErroPagamento] = useState([])
  const [pagando, setPagando] = useState(false)
  const pagandoRef = useRef(false)
  const [mensagemSucessoPagamento, setMensagemSucessoPagamento] = useState('')

  const [estornoAberto, setEstornoAberto] = useState(false)
  const [expenseIdEstorno, setExpenseIdEstorno] = useState('')
  const [erroSelecaoEstorno, setErroSelecaoEstorno] = useState('')
  const [valorEstorno, setValorEstorno] = useState('')
  const [erroValorEstorno, setErroValorEstorno] = useState('')
  const [mensagensErroEstorno, setMensagensErroEstorno] = useState([])
  const [estornando, setEstornando] = useState(false)
  const estornandoRef = useRef(false)
  const [mensagemSucessoEstorno, setMensagemSucessoEstorno] = useState('')

  const carregar = useCallback(() => {
    const id = ++requisicaoAtualRef.current

    setEstado('carregando')
    setMensagensErro([])

    return getCreditCardInvoice(invoiceId)
      .then((resposta) => {
        if (id !== requisicaoAtualRef.current) return
        setFatura(resposta ?? null)
        setEstado('pronto')
      })
      .catch((erro) => {
        if (id !== requisicaoAtualRef.current) return
        setMensagensErro(getErrorMessages(erro))
        setEstado('erro')
      })
  }, [invoiceId])

  useEffect(() => {
    const timer = setTimeout(carregar, 0)
    return () => {
      clearTimeout(timer)
      requisicaoAtualRef.current += 1
    }
  }, [carregar])

  function abrirPagamento() {
    setMensagemSucessoPagamento('')
    setMensagensErroPagamento([])
    setErroValorPagamento('')
    setValorPagamento('')
    setPagamentoAberto(true)
  }

  function fecharPagamento() {
    setPagamentoAberto(false)
    setMensagensErroPagamento([])
    setErroValorPagamento('')
    setValorPagamento('')
  }

  function formatarValorPagamento() {
    const valor = parseCurrencyInput(valorPagamento)
    if (valor !== null && valor > 0) setValorPagamento(formatCurrency(valor))
  }

  async function handlePagamento(evento) {
    evento.preventDefault()
    if (pagandoRef.current || !fatura) return

    const erro = validarPagamento(valorPagamento, fatura.outstandingAmount)
    setErroValorPagamento(erro)
    setMensagensErroPagamento([])
    if (erro) return

    pagandoRef.current = true
    setPagando(true)

    try {
      await registerCreditCardPayment(invoiceId, {
        amount: parseCurrencyInput(valorPagamento),
      })
      setMensagemSucessoPagamento('Pagamento registrado.')
      fecharPagamento()
      carregar()
    } catch (erro) {
      setMensagensErroPagamento(getErrorMessages(erro))
    } finally {
      pagandoRef.current = false
      setPagando(false)
    }
  }

  function abrirEstorno(expenseId = '') {
    setMensagemSucessoEstorno('')
    setMensagensErroEstorno([])
    setErroSelecaoEstorno('')
    setErroValorEstorno('')
    setValorEstorno('')
    setExpenseIdEstorno(expenseId || comprasEstornaveis[0]?.expenseId || '')
    setEstornoAberto(true)
  }

  function fecharEstorno() {
    setEstornoAberto(false)
    setMensagensErroEstorno([])
    setErroSelecaoEstorno('')
    setErroValorEstorno('')
    setValorEstorno('')
  }

  function formatarValorEstorno() {
    const valor = parseCurrencyInput(valorEstorno)
    if (valor !== null && valor > 0) setValorEstorno(formatCurrency(valor))
  }

  async function handleEstorno(evento) {
    evento.preventDefault()
    if (estornandoRef.current) return

    const erroSelecao = expenseIdEstorno ? '' : 'Selecione a compra a estornar.'
    const erroValor = validarEstorno(valorEstorno)
    setErroSelecaoEstorno(erroSelecao)
    setErroValorEstorno(erroValor)
    setMensagensErroEstorno([])
    if (erroSelecao || erroValor) return

    estornandoRef.current = true
    setEstornando(true)

    try {
      await registerCreditCardRefund(expenseIdEstorno, {
        amount: parseCurrencyInput(valorEstorno),
      })
      setMensagemSucessoEstorno('Estorno registrado.')
      fecharEstorno()
      carregar()
    } catch (erro) {
      setMensagensErroEstorno(getErrorMessages(erro))
    } finally {
      estornandoRef.current = false
      setEstornando(false)
    }
  }

  const installments = listaOuVazio(fatura?.installments)
  const payments = listaOuVazio(fatura?.payments)
  const creditApplications = listaOuVazio(fatura?.creditApplications)
  const refunds = listaOuVazio(fatura?.refunds)

  const comprasEstornaveis = []
  const comprasVistas = new Set()
  for (const parcela of installments) {
    if (parcela.cancelled || !parcela.expenseId || comprasVistas.has(parcela.expenseId)) continue
    comprasVistas.add(parcela.expenseId)
    comprasEstornaveis.push({
      expenseId: parcela.expenseId,
      categoria: parcela.category,
      responsavel: parcela.memberName,
      parcela: `${parcela.installmentNumber}/${parcela.installmentCount}`,
      valorParcela: parcela.amount,
    })
  }

  function totalEstornos(expenseId) {
    return refunds
      .filter((estorno) => estorno.expenseId === expenseId)
      .reduce((total, estorno) => total + Number(estorno.amount ?? 0), 0)
  }

  return (
    <main className="container invoice-detail">
      <nav className="credit-cards__breadcrumb" aria-label="Trilha de navegação">
        <HomeBreadcrumbLink />
        <span aria-hidden="true">/</span>
        <Link to="/credit-cards">Cartões de crédito</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Detalhe da fatura</span>
      </nav>

      <header className="credit-cards__hero">
        <div className="credit-cards__intro">
          <p className="credit-cards__eyebrow">Detalhamento da fatura</p>
          <h1 className="credit-cards__title">Detalhamento da fatura</h1>
          <p className="credit-cards__subtitle">Fatura {invoiceId}</p>
        </div>
      </header>

      {mensagemSucessoPagamento && (
        <p className="invoice-detail__success" role="status">{mensagemSucessoPagamento}</p>
      )}

      {mensagemSucessoEstorno && (
        <p className="invoice-detail__success" role="status">{mensagemSucessoEstorno}</p>
      )}

      {estado === 'carregando' && (
        <p className="credit-cards__status" role="status">Carregando fatura...</p>
      )}

      {estado === 'erro' && (
        <div className="credit-cards__error" role="alert">
          {mensagensErro.map((mensagem, indice) => (
            <p key={indice}>{mensagem}</p>
          ))}
          <button type="button" className="credit-cards__retry" onClick={carregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {estado === 'pronto' && !fatura && (
        <p className="credit-cards__empty">Fatura não encontrada.</p>
      )}

      {estado === 'pronto' && fatura && (
        <>
          <section className="credit-cards__section" aria-label="Resumo da fatura">
            <div className="invoice-detail__head">
              <div>
                <h2 className="credit-cards__section-title">Resumo da fatura</h2>
                <p className="invoice-detail__period">
                  Ciclo {formatDate(fatura.cycleStart)} · Cartão {fatura.cardId}
                </p>
              </div>
              <span className={`credit-cards__status-tag credit-cards__status-tag--${fatura.status}`}>
                {rotuloStatus(fatura.status)}
              </span>
            </div>

            <dl className="invoice-detail__amounts">
              <div>
                <dt>Valor total</dt>
                <dd>{formatCurrency(fatura.totalAmount)}</dd>
              </div>
              <div>
                <dt>Valor pendente</dt>
                <dd>{formatCurrency(fatura.outstandingAmount)}</dd>
              </div>
              <div>
                <dt>Valor pago</dt>
                <dd>{formatCurrency(fatura.paidAmount)}</dd>
              </div>
              <div>
                <dt>Crédito aplicado</dt>
                <dd>{formatCurrency(fatura.creditAmount)}</dd>
              </div>
            </dl>

            <p className="invoice-detail__dates">
              Fechamento em {formatDate(fatura.closingDate)} · Vencimento em {formatDate(fatura.dueDate)}
            </p>

            {Number(fatura.outstandingAmount) > 0 && (
              <button type="button" className="credit-cards__register" onClick={abrirPagamento}>
                Registrar pagamento
              </button>
            )}
          </section>

          <section className="credit-cards__section" aria-label="Gastos da fatura">
            <h2 className="credit-cards__section-title">Gastos e parcelas</h2>

            {installments.length === 0 ? (
              <p className="credit-cards__empty">Nenhum gasto encontrado nesta fatura.</p>
            ) : (
              <>
                <div className="invoice-detail__table-scroll">
                  <table className="invoice-detail__table" data-testid="invoice-detail-instalments-tabela">
                    <thead>
                      <tr>
                        <th scope="col">Categoria</th>
                        <th scope="col">Responsável</th>
                        <th scope="col">Parcela</th>
                        <th scope="col" className="credit-cards__cell--amount">Valor</th>
                        <th scope="col" className="credit-cards__cell--amount">Pendente</th>
                        <th scope="col">Situação</th>
                        <th scope="col">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((parcela) => (
                        <tr key={parcela.id}>
                          <td>{parcela.category}</td>
                          <td>{parcela.memberName}</td>
                          <td>{parcela.installmentNumber}/{parcela.installmentCount}</td>
                          <td className="credit-cards__cell--amount">{formatCurrency(parcela.amount)}</td>
                          <td className="credit-cards__cell--amount">
                            {formatCurrency(parcela.outstandingAmount)}
                          </td>
                          <td>{parcela.cancelled ? 'Cancelada' : 'Ativa'}</td>
                          <td>
                            {!parcela.cancelled && parcela.expenseId && (
                              <button
                                type="button"
                                className="credit-cards__edit-button"
                                onClick={() => abrirEstorno(parcela.expenseId)}
                              >
                                Estornar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="invoice-detail__mobile-list" data-testid="invoice-detail-instalments-cards">
                  {installments.map((parcela) => (
                    <li className="invoice-detail__item" key={parcela.id}>
                      <p className="invoice-detail__item-title">
                        {parcela.category} · {parcela.installmentNumber}/{parcela.installmentCount}
                      </p>
                      <dl className="invoice-detail__item-details">
                        <dt>Responsável</dt>
                        <dd>{parcela.memberName}</dd>
                        <dt>Valor</dt>
                        <dd>{formatCurrency(parcela.amount)}</dd>
                        <dt>Pago</dt>
                        <dd>{formatCurrency(parcela.paidAmount)}</dd>
                        <dt>Estornado</dt>
                        <dd>{formatCurrency(parcela.refundedAmount)}</dd>
                        <dt>Pendente</dt>
                        <dd>{formatCurrency(parcela.outstandingAmount)}</dd>
                        <dt>Compra</dt>
                        <dd>{parcela.expenseId}</dd>
                        <dt>Situação</dt>
                        <dd>{parcela.cancelled ? 'Cancelada' : 'Ativa'}</dd>
                      </dl>
                      {!parcela.cancelled && parcela.expenseId && (
                        <button
                          type="button"
                          className="credit-cards__edit-button credit-cards__edit-button--card"
                          onClick={() => abrirEstorno(parcela.expenseId)}
                        >
                          Estornar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="credit-cards__section" aria-label="Pagamentos da fatura">
            <h2 className="credit-cards__section-title">Pagamentos</h2>
            {payments.length === 0 ? (
              <p className="credit-cards__empty">Nenhum pagamento registrado nesta fatura.</p>
            ) : (
              <ul className="invoice-detail__list" data-testid="invoice-detail-payments">
                {payments.map((pagamento) => (
                  <li className="invoice-detail__list-item" key={pagamento.id}>
                    <div>
                      <p className="invoice-detail__item-title">{formatCurrency(pagamento.amount)}</p>
                      <p className="invoice-detail__item-meta">
                        {formatarDataHora(pagamento.paidAt)} · {pagamento.registeredBy}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="credit-cards__section" aria-label="Créditos da fatura">
            <h2 className="credit-cards__section-title">Créditos e aplicações</h2>
            {creditApplications.length === 0 ? (
              <p className="credit-cards__empty">Nenhuma aplicação de crédito nesta fatura.</p>
            ) : (
              <ul className="invoice-detail__list" data-testid="invoice-detail-credits">
                {creditApplications.map((aplicacao) => (
                  <li className="invoice-detail__list-item" key={aplicacao.id}>
                    <div>
                      <p className="invoice-detail__item-title">{formatCurrency(aplicacao.amount)}</p>
                      <p className="invoice-detail__item-meta">
                        Crédito restante: {formatCurrency(aplicacao.remainingCredit)}
                        {' · '}
                        {formatarDataHora(aplicacao.appliedAt)}
                        {' · '}
                        Estorno {aplicacao.refundId}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="credit-cards__section" aria-label="Estornos da fatura">
            <div className="invoice-detail__head">
              <h2 className="credit-cards__section-title">Estornos</h2>
              {comprasEstornaveis.length > 0 && (
                <button type="button" className="credit-cards__register" onClick={() => abrirEstorno()}>
                  Registrar estorno
                </button>
              )}
            </div>
            {refunds.length === 0 ? (
              <p className="credit-cards__empty">Nenhum estorno registrado nesta fatura.</p>
            ) : (
              <ul className="invoice-detail__list" data-testid="invoice-detail-refunds">
                {refunds.map((estorno) => (
                  <li className="invoice-detail__list-item" key={estorno.id}>
                    <div>
                      <p className="invoice-detail__item-title">{formatCurrency(estorno.amount)}</p>
                      <p className="invoice-detail__item-meta">
                        Compra {estorno.expenseId}
                        {' · '}
                        {formatarDataHora(estorno.createdAt)}
                        {' · '}
                        {estorno.registeredBy}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {pagamentoAberto && fatura && (
        <section
          className="invoice-detail__payment"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-payment-title"
        >
          <div className="invoice-detail__head">
            <div>
              <h2 className="credit-cards__section-title" id="invoice-payment-title">
                Registrar pagamento
              </h2>
              <p className="invoice-detail__period">
                Saldo pendente: {formatCurrency(fatura.outstandingAmount)}
              </p>
            </div>
            <button type="button" className="credit-cards__cancel" onClick={fecharPagamento} disabled={pagando}>
              Fechar
            </button>
          </div>

          {mensagensErroPagamento.length > 0 && (
            <div className="credit-cards__error" role="alert">
              {mensagensErroPagamento.map((mensagem, indice) => (
                <p key={indice}>{mensagem}</p>
              ))}
            </div>
          )}

          <form onSubmit={handlePagamento} noValidate>
            <div className="credit-cards__field">
              <label htmlFor="invoice-payment-amount">Valor do pagamento</label>
              <input
                id="invoice-payment-amount"
                name="valorPagamento"
                type="text"
                inputMode="decimal"
                value={valorPagamento}
                onChange={(evento) => {
                  setValorPagamento(evento.target.value)
                  setErroValorPagamento('')
                }}
                onBlur={formatarValorPagamento}
                aria-invalid={Boolean(erroValorPagamento)}
                aria-describedby={erroValorPagamento ? 'invoice-payment-error' : undefined}
                disabled={pagando}
              />
              {erroValorPagamento && (
                <p className="credit-cards__field-error" id="invoice-payment-error" role="alert">
                  {erroValorPagamento}
                </p>
              )}
            </div>

            <div className="invoice-detail__payment-actions">
              <button type="submit" className="credit-cards__submit" disabled={pagando}>
                {pagando ? 'Registrando...' : 'Confirmar pagamento'}
              </button>
              <button type="button" className="credit-cards__cancel" onClick={fecharPagamento} disabled={pagando}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {estornoAberto && fatura && (
        <section
          className="invoice-detail__payment"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-refund-title"
        >
          <div className="invoice-detail__head">
            <div>
              <h2 className="credit-cards__section-title" id="invoice-refund-title">
                Registrar estorno
              </h2>
            </div>
            <button type="button" className="credit-cards__cancel" onClick={fecharEstorno} disabled={estornando}>
              Fechar
            </button>
          </div>

          {mensagensErroEstorno.length > 0 && (
            <div className="credit-cards__error" role="alert">
              {mensagensErroEstorno.map((mensagem, indice) => (
                <p key={indice}>{mensagem}</p>
              ))}
            </div>
          )}

          <form onSubmit={handleEstorno} noValidate>
            <div className="credit-cards__field">
              <label htmlFor="invoice-refund-expense">Compra</label>
              <select
                id="invoice-refund-expense"
                name="expenseIdEstorno"
                value={expenseIdEstorno}
                onChange={(evento) => {
                  setExpenseIdEstorno(evento.target.value)
                  setErroSelecaoEstorno('')
                }}
                aria-invalid={Boolean(erroSelecaoEstorno)}
                aria-describedby={erroSelecaoEstorno ? 'invoice-refund-expense-error' : undefined}
                disabled={estornando}
              >
                <option value="">Selecione a compra</option>
                {comprasEstornaveis.map((compra) => (
                  <option key={compra.expenseId} value={compra.expenseId}>
                    {`${compra.categoria} · ${compra.responsavel} · Parcela ${compra.parcela} · ${formatCurrency(compra.valorParcela)}`}
                  </option>
                ))}
              </select>
              {erroSelecaoEstorno && (
                <p className="credit-cards__field-error" id="invoice-refund-expense-error" role="alert">
                  {erroSelecaoEstorno}
                </p>
              )}
              {expenseIdEstorno && (
                <p className="invoice-detail__period">
                  Estornos já registrados nesta compra: {formatCurrency(totalEstornos(expenseIdEstorno))}
                </p>
              )}
            </div>

            <div className="credit-cards__field">
              <label htmlFor="invoice-refund-amount">Valor do estorno</label>
              <input
                id="invoice-refund-amount"
                name="valorEstorno"
                type="text"
                inputMode="decimal"
                value={valorEstorno}
                onChange={(evento) => {
                  setValorEstorno(evento.target.value)
                  setErroValorEstorno('')
                }}
                onBlur={formatarValorEstorno}
                aria-invalid={Boolean(erroValorEstorno)}
                aria-describedby={erroValorEstorno ? 'invoice-refund-error' : undefined}
                disabled={estornando}
              />
              {erroValorEstorno && (
                <p className="credit-cards__field-error" id="invoice-refund-error" role="alert">
                  {erroValorEstorno}
                </p>
              )}
            </div>

            <div className="invoice-detail__payment-actions">
              <button type="submit" className="credit-cards__submit" disabled={estornando}>
                {estornando ? 'Registrando...' : 'Confirmar estorno'}
              </button>
              <button type="button" className="credit-cards__cancel" onClick={fecharEstorno} disabled={estornando}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <Link className="credit-cards__back-link" to="/credit-cards">
        Voltar para Cartões de crédito
      </Link>
    </main>
  )
}
