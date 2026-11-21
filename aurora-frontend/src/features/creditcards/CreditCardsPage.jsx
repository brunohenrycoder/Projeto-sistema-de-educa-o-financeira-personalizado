import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeBreadcrumbLink from '../../shared/components/HomeBreadcrumbLink.jsx'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency, parseCurrencyInput } from '../../shared/format/currency.js'
import { formatDate } from '../../shared/format/date.js'
import { listCreditCards } from './api/listCreditCards.js'
import { listCreditCardInvoices } from './api/listCreditCardInvoices.js'
import { createCreditCard } from './api/createCreditCard.js'
import { updateCreditCard } from './api/updateCreditCard.js'
import { deactivateCreditCard } from './api/deactivateCreditCard.js'
import CreditCardForm from './CreditCardForm.jsx'
import {
  formularioInicial,
  payloadCartao,
  validarCartao,
} from './creditCardForm.js'
import './CreditCardsPage.css'

const ROTULOS_BANDEIRA = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  ELO: 'Elo',
  AMERICAN_EXPRESS: 'American Express',
  HIPERCARD: 'Hipercard',
  OUTRA: 'Outra',
}

const ROTULOS_STATUS = {
  OPEN: 'Aberta',
  CLOSED: 'Fechada',
  PARTIALLY_PAID: 'Parcialmente paga',
  PAID: 'Paga',
  OVERDUE: 'Vencida',
}

const FILTROS_STATUS = [
  { value: '', rotulo: 'Todas as faturas' },
  { value: 'OPEN', rotulo: 'Abertas' },
  { value: 'CLOSED', rotulo: 'Fechadas' },
  { value: 'PARTIALLY_PAID', rotulo: 'Parcialmente pagas' },
  { value: 'OVERDUE', rotulo: 'Vencidas' },
  { value: 'PAID', rotulo: 'Pagas' },
]

function rotuloBandeira(cartao) {
  if (cartao.network === 'OUTRA' && cartao.otherNetworkName) return cartao.otherNetworkName
  return ROTULOS_BANDEIRA[cartao.network] ?? cartao.network ?? ''
}

function rotuloStatus(status) {
  return ROTULOS_STATUS[status] ?? status ?? ''
}

function mensagemFaturas(filtro, total, quantidadeVisiveis) {
  if (quantidadeVisiveis > 0) return ''
  if (filtro) return 'Nenhuma fatura encontrada para o filtro selecionado.'
  if (total === 0) return 'Nenhuma fatura encontrada.'
  return 'Nenhuma fatura pendente no momento.'
}

function mensagemSemCartaoAtivo(total) {
  if (total === 0) return 'Nenhum cartão de crédito cadastrado.'
  return 'Nenhum cartão de crédito ativo.'
}

function CartaoCard({ cartao, onEditar, onDesativar, mostrarAcoes = true }) {
  return (
    <article className="credit-cards__card">
      <div className="credit-cards__card-head">
        <div>
          <h3 className="credit-cards__card-name">{cartao.name}</h3>
          <p className="credit-cards__card-meta">
            {cartao.issuer}
            {' · '}
            {rotuloBandeira(cartao)}
            {cartao.lastFourDigits ? ` · final ${cartao.lastFourDigits}` : ''}
          </p>
        </div>
        <span
          className={`credit-cards__tag credit-cards__tag--${cartao.active ? 'ativo' : 'inativo'}`}
        >
          {cartao.active ? 'Ativo' : 'Desativado'}
        </span>
      </div>

      <dl className="credit-cards__limits">
        <div>
          <dt>Limite total</dt>
          <dd>{formatCurrency(cartao.totalLimit)}</dd>
        </div>
        <div>
          <dt>Limite utilizado</dt>
          <dd>{formatCurrency(cartao.limitUsed)}</dd>
        </div>
        <div>
          <dt>Limite disponível</dt>
          <dd>{formatCurrency(cartao.limitAvailable)}</dd>
        </div>
      </dl>

      <p className="credit-cards__card-days">
        Fechamento dia {cartao.closingDay} · Vencimento dia {cartao.dueDay}
      </p>

      {Number(cartao.pendingCreditAmount) > 0 && (
        <p className="credit-cards__credit">
          Crédito pendente de estorno: {formatCurrency(cartao.pendingCreditAmount)}
        </p>
      )}

      {cartao.limitExceeded && (
        <p className="credit-cards__limit-alert" role="status">
          Limite comprometido excedido.
        </p>
      )}

      {cartao.limitDisclaimer && (
        <p className="credit-cards__disclaimer">{cartao.limitDisclaimer}</p>
      )}

      {mostrarAcoes && (
        <div className="credit-cards__card-actions">
          <button type="button" className="credit-cards__edit-button" onClick={onEditar}>
            Editar
          </button>
          <button type="button" className="credit-cards__deactivate-button" onClick={onDesativar}>
            Desativar
          </button>
        </div>
      )}
    </article>
  )
}

export default function CreditCardsPage() {
  const navigate = useNavigate()
  const [estadoCartao, setEstadoCartao] = useState('carregando')
  const [cartoes, setCartoes] = useState([])
  const [mensagensErroCartao, setMensagensErroCartao] = useState([])
  const [estadoFaturas, setEstadoFaturas] = useState('carregando')
  const [faturas, setFaturas] = useState([])
  const [mensagensErroFaturas, setMensagensErroFaturas] = useState([])
  const [filtroStatus, setFiltroStatus] = useState('')
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [historicoCartoesAberto, setHistoricoCartoesAberto] = useState(false)
  const cartaoReqRef = useRef(0)
  const faturasReqRef = useRef(0)

  const [painelAtivo, setPainelAtivo] = useState(null)
  const [formulario, setFormulario] = useState(formularioInicial)
  const [errosFormulario, setErrosFormulario] = useState({})
  const [mensagensErroFormulario, setMensagensErroFormulario] = useState([])
  const [salvando, setSalvando] = useState(false)
  const salvandoRef = useRef(false)
  const [desativandoId, setDesativandoId] = useState(null)
  const [mensagensErroDesativacao, setMensagensErroDesativacao] = useState([])
  const [desativando, setDesativando] = useState(false)
  const desativandoRef = useRef(false)
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const ultimoFocoRef = useRef(null)

  const carregarCartao = useCallback(() => {
    const id = ++cartaoReqRef.current

    setEstadoCartao('carregando')
    setMensagensErroCartao([])

    return listCreditCards()
      .then((resposta) => {
        if (id !== cartaoReqRef.current) return
        setCartoes(Array.isArray(resposta?.cards) ? resposta.cards : [])
        setEstadoCartao('pronto')
      })
      .catch((erro) => {
        if (id !== cartaoReqRef.current) return
        setMensagensErroCartao(getErrorMessages(erro))
        setEstadoCartao('erro')
      })
  }, [])

  const carregarFaturas = useCallback(() => {
    const id = ++faturasReqRef.current

    setEstadoFaturas('carregando')
    setMensagensErroFaturas([])

    return listCreditCardInvoices(filtroStatus ? { status: filtroStatus } : {})
      .then((resposta) => {
        if (id !== faturasReqRef.current) return
        setFaturas(Array.isArray(resposta?.invoices) ? resposta.invoices : [])
        setEstadoFaturas('pronto')
      })
      .catch((erro) => {
        if (id !== faturasReqRef.current) return
        setMensagensErroFaturas(getErrorMessages(erro))
        setEstadoFaturas('erro')
      })
  }, [filtroStatus])

  useEffect(() => {
    const timer = setTimeout(carregarCartao, 0)
    return () => {
      clearTimeout(timer)
      cartaoReqRef.current += 1
    }
  }, [carregarCartao])

  useEffect(() => {
    const timer = setTimeout(carregarFaturas, 0)
    return () => {
      clearTimeout(timer)
      faturasReqRef.current += 1
    }
  }, [carregarFaturas])

  function aoAlterarFiltro(evento) {
    setFiltroStatus(evento.target.value)
    setHistoricoAberto(false)
  }

  const cartoesAtivos = useMemo(
    () => cartoes.filter((cartao) => cartao.active === true),
    [cartoes],
  )

  const cartoesDesativados = useMemo(
    () => cartoes.filter((cartao) => cartao.active !== true),
    [cartoes],
  )

  function alternarHistoricoCartoes() {
    setHistoricoCartoesAberto((aberto) => !aberto)
  }

  const exibirHistorico = filtroStatus === ''

  const faturasVisiveis = useMemo(
    () => (exibirHistorico ? faturas.filter((fatura) => fatura.status !== 'PAID') : faturas),
    [exibirHistorico, faturas],
  )

  const faturaAtual = useMemo(
    () => faturas.find((fatura) => fatura.status === 'OPEN')
      ?? faturas.find((fatura) => fatura.status === 'PARTIALLY_PAID')
      ?? null,
    [faturas],
  )

  const faturasPagas = useMemo(
    () => faturas.filter((fatura) => fatura.status === 'PAID'),
    [faturas],
  )

  function abrirFatura(fatura) {
    navigate(`/credit-cards/invoices/${fatura.id}`)
  }

  function abrirPainel(tipo, cartao = null) {
    if (!painelAtivo && document.activeElement instanceof HTMLElement) {
      ultimoFocoRef.current = document.activeElement
    }
    setMensagemSucesso('')
    setMensagensErroFormulario([])
    setMensagensErroDesativacao([])
    setErrosFormulario({})
    setFormulario(formularioInicial(cartao))
    setDesativandoId(cartao?.id ?? null)
    setPainelAtivo({ tipo, id: cartao?.id ?? null })
  }

  function fecharPainel() {
    setPainelAtivo(null)
    setErrosFormulario({})
    setMensagensErroFormulario([])
    setMensagensErroDesativacao([])
    setDesativandoId(null)
  }

  useEffect(() => {
    if (!painelAtivo) {
      const anterior = ultimoFocoRef.current
      if (anterior?.isConnected) anterior.focus()
      return
    }
    document.getElementById(`painel-cartao-${painelAtivo.tipo}`)?.focus()
  }, [painelAtivo])

  useEffect(() => {
    if (!painelAtivo) return undefined

    function aoTeclado(evento) {
      if (evento.key !== 'Escape') return
      setPainelAtivo(null)
      setErrosFormulario({})
      setMensagensErroFormulario([])
      setMensagensErroDesativacao([])
      setDesativandoId(null)
    }

    document.addEventListener('keydown', aoTeclado)
    return () => document.removeEventListener('keydown', aoTeclado)
  }, [painelAtivo])

  function atualizarCampo(evento) {
    const { name, value } = evento.target
    setFormulario((anterior) => ({ ...anterior, [name]: value }))
  }

  function formatarLimite() {
    const valor = parseCurrencyInput(formulario.totalLimit)
    if (valor !== null && valor > 0) {
      setFormulario((anterior) => ({ ...anterior, totalLimit: formatCurrency(valor) }))
    }
  }

  async function handleSubmit(evento) {
    evento.preventDefault()
    if (salvandoRef.current || !painelAtivo) return

    const errosEncontrados = validarCartao(formulario)
    setErrosFormulario(errosEncontrados)
    setMensagensErroFormulario([])
    if (Object.keys(errosEncontrados).length > 0) return

    salvandoRef.current = true
    setSalvando(true)

    const payload = payloadCartao(formulario)
    const editando = painelAtivo.tipo === 'edicao'

    try {
      if (editando) {
        await updateCreditCard(painelAtivo.id, payload)
        setMensagemSucesso('Cartão atualizado.')
      } else {
        await createCreditCard(payload)
        setMensagemSucesso('Cartão cadastrado.')
      }
      fecharPainel()
      carregarCartao()
    } catch (erro) {
      setMensagensErroFormulario(getErrorMessages(erro))
    } finally {
      salvandoRef.current = false
      setSalvando(false)
    }
  }

  async function confirmarDesativacao() {
    if (desativandoRef.current || !desativandoId) return

    desativandoRef.current = true
    setDesativando(true)
    setMensagensErroDesativacao([])

    try {
      await deactivateCreditCard(desativandoId)
      setMensagemSucesso('Cartão desativado.')
      fecharPainel()
      carregarCartao()
    } catch (erro) {
      setMensagensErroDesativacao(getErrorMessages(erro))
    } finally {
      desativandoRef.current = false
      setDesativando(false)
    }
  }

  const cartaoEmDesativacao = cartoes.find((cartao) => cartao.id === desativandoId)

  return (
    <main className="container credit-cards">
      <nav className="credit-cards__breadcrumb" aria-label="Trilha de navegação">
        <HomeBreadcrumbLink />
        <span aria-hidden="true">/</span>
        <span aria-current="page">Cartões de crédito</span>
      </nav>

      <header className="credit-cards__hero">
        <div className="credit-cards__intro">
          <h1 className="credit-cards__title">Cartões de crédito</h1>
          <p className="credit-cards__subtitle">
            Acompanhe os limites do cartão da família e as faturas de cada ciclo.
          </p>
        </div>
        <button
          type="button"
          className="credit-cards__register"
          onClick={() => abrirPainel('cadastro')}
        >
          Cadastrar cartão
        </button>
      </header>

      {mensagemSucesso && (
        <p className="credit-cards__success" role="status">{mensagemSucesso}</p>
      )}

      <section className="credit-cards__section" aria-label="Cartão de crédito">
        <h2 className="credit-cards__section-title">Cartão da família</h2>

        {estadoCartao === 'carregando' && (
          <p className="credit-cards__status" role="status">Carregando cartão de crédito...</p>
        )}

        {estadoCartao === 'erro' && (
          <div className="credit-cards__error" role="alert">
            {mensagensErroCartao.map((mensagem, indice) => (
              <p key={indice}>{mensagem}</p>
            ))}
            <button type="button" className="credit-cards__retry" onClick={carregarCartao}>
              Tentar novamente
            </button>
          </div>
        )}

        {estadoCartao === 'pronto' && (
          cartoesAtivos.length === 0 ? (
            <div className="credit-cards__empty">
              <p>{mensagemSemCartaoAtivo(cartoes.length)}</p>
              <p className="credit-cards__empty-hint">
                Cadastre um cartão para acompanhar os limites e as faturas da família.
              </p>
            </div>
          ) : (
            <div className="credit-cards__cards">
              {cartoesAtivos.map((cartao) => (
                <CartaoCard
                  key={cartao.id}
                  cartao={cartao}
                  onEditar={() => abrirPainel('edicao', cartao)}
                  onDesativar={() => abrirPainel('desativacao', cartao)}
                />
              ))}
            </div>
          )
        )}

        {estadoCartao === 'pronto' && (
          <>
            <button
              type="button"
              className="credit-cards__history-toggle"
              data-testid="credit-cards-cartoes-historico-toggle"
              aria-label="Histórico de cartões desativados"
              aria-expanded={historicoCartoesAberto}
              aria-controls="credit-cards-cartoes-historico"
              onClick={alternarHistoricoCartoes}
            >
              Histórico
              <span className="credit-cards__history-count" aria-hidden="true">
                {cartoesDesativados.length}
              </span>
            </button>

            {historicoCartoesAberto && (
              <section
                id="credit-cards-cartoes-historico"
                className="credit-cards__history"
                aria-label="Histórico de cartões desativados"
              >
                <h3 className="credit-cards__history-title">Cartões desativados</h3>
                {cartoesDesativados.length === 0 ? (
                  <p className="credit-cards__empty">Nenhum cartão desativado.</p>
                ) : (
                  <div
                    className="credit-cards__cards"
                    data-testid="credit-cards-cartoes-historico-lista"
                  >
                    {cartoesDesativados.map((cartao) => (
                      <CartaoCard key={cartao.id} cartao={cartao} mostrarAcoes={false} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </section>

      {(painelAtivo?.tipo === 'cadastro' || painelAtivo?.tipo === 'edicao') && (
        <section
          className="credit-cards__panel"
          aria-label={painelAtivo.tipo === 'edicao' ? 'Editar cartão' : 'Cadastrar cartão'}
          id={`painel-cartao-${painelAtivo.tipo}`}
          tabIndex={-1}
        >
          <h2 className="credit-cards__section-title">
            {painelAtivo.tipo === 'edicao' ? 'Editar cartão' : 'Cadastrar cartão'}
          </h2>

          <form onSubmit={handleSubmit} noValidate>
            <CreditCardForm
              formulario={formulario}
              erros={errosFormulario}
              onChange={atualizarCampo}
              onBlurLimite={formatarLimite}
              idPrefix={`cartao-${painelAtivo.tipo}`}
              desabilitado={salvando}
            />

            {mensagensErroFormulario.length > 0 && (
              <div className="credit-cards__error" role="alert">
                {mensagensErroFormulario.map((mensagem, indice) => (
                  <p key={indice}>{mensagem}</p>
                ))}
              </div>
            )}

            <div className="credit-cards__panel-actions">
              <button type="submit" className="credit-cards__submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                className="credit-cards__cancel"
                onClick={fecharPainel}
                disabled={salvando}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {painelAtivo?.tipo === 'desativacao' && (
        <section
          className="credit-cards__panel"
          aria-label="Desativar cartão"
          id="painel-cartao-desativacao"
          tabIndex={-1}
        >
          <h2 className="credit-cards__section-title">Desativar cartão</h2>
          <p className="credit-cards__confirm-text">
            {cartaoEmDesativacao?.name
              ? `Deseja desativar o cartão ${cartaoEmDesativacao.name}?`
              : 'Deseja desativar este cartão?'}
          </p>
          <p className="credit-cards__confirm-text">
            O cartão deixará de aceitar novas despesas. Faturas, parcelas e pagamentos
            existentes serão preservados.
          </p>

          {mensagensErroDesativacao.length > 0 && (
            <div className="credit-cards__error" role="alert">
              {mensagensErroDesativacao.map((mensagem, indice) => (
                <p key={indice}>{mensagem}</p>
              ))}
            </div>
          )}

          <div className="credit-cards__panel-actions">
            <button
              type="button"
              className="credit-cards__deactivate-confirm"
              onClick={confirmarDesativacao}
              disabled={desativando}
            >
              {desativando ? 'Desativando...' : 'Desativar cartão'}
            </button>
            <button
              type="button"
              className="credit-cards__cancel"
              onClick={fecharPainel}
              disabled={desativando}
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      {estadoFaturas === 'pronto' && faturaAtual && (
        <section className="credit-cards__current-invoice" aria-label="Fatura atual">
          <div className="credit-cards__current-invoice-head">
            <div>
              <h2 className="credit-cards__section-title">Fatura atual</h2>
              <p className="credit-cards__current-invoice-value">
                {formatCurrency(faturaAtual.totalAmount)}
              </p>
              <p className="credit-cards__current-invoice-meta">
                {rotuloStatus(faturaAtual.status)}
              </p>
            </div>
            <div className="credit-cards__current-invoice-actions">
              <button type="button" className="credit-cards__register" onClick={() => abrirFatura(faturaAtual)}>
                Ver fatura
              </button>
              <button type="button" className="credit-cards__secondary" onClick={() => abrirFatura(faturaAtual)}>
                Registrar pagamento
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="credit-cards__section" aria-label="Faturas">
        <div className="credit-cards__invoices-head">
          <h2 className="credit-cards__section-title">Faturas</h2>
          <div className="credit-cards__filter">
            <label htmlFor="credit-cards-status">Status</label>
            <select
              id="credit-cards-status"
              value={filtroStatus}
              onChange={aoAlterarFiltro}
            >
              {FILTROS_STATUS.map((opcao) => (
                <option key={opcao.value} value={opcao.value}>{opcao.rotulo}</option>
              ))}
            </select>
          </div>
        </div>

        {estadoFaturas === 'carregando' && (
          <p className="credit-cards__status" role="status">Carregando faturas...</p>
        )}

        {estadoFaturas === 'erro' && (
          <div className="credit-cards__error" role="alert">
            {mensagensErroFaturas.map((mensagem, indice) => (
              <p key={indice}>{mensagem}</p>
            ))}
            <button type="button" className="credit-cards__retry" onClick={carregarFaturas}>
              Tentar novamente
            </button>
          </div>
        )}

        {estadoFaturas === 'pronto' && (
          <>
            {faturasVisiveis.length === 0 ? (
              <p className="credit-cards__empty">
                {mensagemFaturas(filtroStatus, faturas.length, faturasVisiveis.length)}
              </p>
            ) : (
              <>
                <div className="credit-cards__table-scroll">
                  <table className="credit-cards__table" data-testid="credit-cards-tabela">
                    <thead>
                      <tr>
                        <th scope="col">Ciclo</th>
                        <th scope="col" className="credit-cards__cell--amount">Valor</th>
                        <th scope="col">Fechamento</th>
                        <th scope="col">Vencimento</th>
                        <th scope="col">Status</th>
                        <th scope="col">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faturasVisiveis.map((fatura) => (
                        <tr key={fatura.id}>
                          <td>{formatDate(fatura.cycleStart)}</td>
                          <td className="credit-cards__cell--amount">
                            {formatCurrency(fatura.outstandingAmount)}
                          </td>
                          <td>{formatDate(fatura.closingDate)}</td>
                          <td>{formatDate(fatura.dueDate)}</td>
                          <td>
                            <span className={`credit-cards__status-tag credit-cards__status-tag--${fatura.status}`}>
                              {rotuloStatus(fatura.status)}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="credit-cards__details-button"
                              onClick={() => abrirFatura(fatura)}
                            >
                              Ver detalhe
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="credit-cards__mobile-list" data-testid="credit-cards-cards">
                  {faturasVisiveis.map((fatura) => (
                    <li className="credit-cards__invoice-card" key={fatura.id}>
                      <p className="credit-cards__invoice-value">
                        {formatCurrency(fatura.outstandingAmount)}
                      </p>
                      <dl className="credit-cards__invoice-details">
                        <dt>Ciclo</dt>
                        <dd>{formatDate(fatura.cycleStart)}</dd>
                        <dt>Fechamento</dt>
                        <dd>{formatDate(fatura.closingDate)}</dd>
                        <dt>Vencimento</dt>
                        <dd>{formatDate(fatura.dueDate)}</dd>
                        <dt>Status</dt>
                        <dd>
                          <span className={`credit-cards__status-tag credit-cards__status-tag--${fatura.status}`}>
                            {rotuloStatus(fatura.status)}
                          </span>
                        </dd>
                      </dl>
                      <button
                        type="button"
                        className="credit-cards__details-button credit-cards__details-button--card"
                        onClick={() => abrirFatura(fatura)}
                      >
                        Ver detalhe
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {exibirHistorico && (
              <>
                <button
                  type="button"
                  className="credit-cards__history-toggle"
                  aria-label="Histórico de faturas"
                  aria-expanded={historicoAberto}
                  aria-controls="credit-cards-historico"
                  onClick={() => setHistoricoAberto((aberto) => !aberto)}
                >
                  Histórico
                  <span className="credit-cards__history-count" aria-hidden="true">
                    {faturasPagas.length}
                  </span>
                </button>

                {historicoAberto && (
                  <section
                    id="credit-cards-historico"
                    className="credit-cards__history"
                    aria-label="Histórico de faturas pagas"
                  >
                    <h3 className="credit-cards__history-title">Faturas pagas</h3>
                    {faturasPagas.length === 0 ? (
                      <p className="credit-cards__empty">Nenhuma fatura paga encontrada.</p>
                    ) : (
                      <ul className="credit-cards__history-list" data-testid="credit-cards-historico-lista">
                        {faturasPagas.map((fatura) => (
                          <li className="credit-cards__history-item" key={fatura.id}>
                            <div>
                              <p className="credit-cards__history-period">
                                Ciclo {formatDate(fatura.cycleStart)}
                              </p>
                              <p className="credit-cards__history-value">
                                {formatCurrency(fatura.totalAmount)}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="credit-cards__details-button"
                              onClick={() => abrirFatura(fatura)}
                            >
                              Ver detalhe
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </section>

      <footer className="credit-cards__page-footer">Aurora</footer>
    </main>
  )
}
