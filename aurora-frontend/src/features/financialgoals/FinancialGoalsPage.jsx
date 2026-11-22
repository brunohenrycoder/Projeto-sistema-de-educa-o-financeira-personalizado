import { useCallback, useEffect, useRef, useState } from 'react'
import HomeBreadcrumbLink from '../../shared/components/HomeBreadcrumbLink.jsx'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency, parseCurrencyInput } from '../../shared/format/currency.js'
import { getSavingsSuggestion } from './api/getSavingsSuggestion.js'
import { confirmGoal } from './api/confirmGoal.js'
import { listGoals } from './api/listGoals.js'
import './FinancialGoalsPage.css'

function formatarDataHora(valor) {
  const texto = String(valor ?? '')
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!partes) return ''

  const [, ano, mes, dia, hora, minuto] = partes
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`
}

function validarValor(valor) {
  const numero = parseCurrencyInput(valor)

  if (!String(valor).trim()) return 'Informe o valor da meta.'
  if (numero === null) return 'Informe um valor válido com até duas casas decimais.'
  if (numero <= 0) return 'O valor da meta deve ser maior que zero.'
  if (Math.floor(numero).toString().length > 10) return 'O valor da meta deve ter no máximo 10 dígitos inteiros.'
  return ''
}

export default function FinancialGoalsPage() {
  const [estadoSugestao, setEstadoSugestao] = useState('carregando')
  const [sugestao, setSugestao] = useState(null)
  const [mensagensErroSugestao, setMensagensErroSugestao] = useState([])
  const [sugestaoDispensada, setSugestaoDispensada] = useState(false)
  const sugestaoReqRef = useRef(0)

  const [estadoMetas, setEstadoMetas] = useState('carregando')
  const [metas, setMetas] = useState([])
  const [mensagensErroMetas, setMensagensErroMetas] = useState([])
  const metasReqRef = useRef(0)

  const [etapa, setEtapa] = useState('inicial')
  const [valorMeta, setValorMeta] = useState('')
  const [erroValor, setErroValor] = useState('')
  const [mensagensErroConfirmacao, setMensagensErroConfirmacao] = useState([])
  const [confirmando, setConfirmando] = useState(false)
  const confirmandoRef = useRef(false)
  const [mensagemSucesso, setMensagemSucesso] = useState('')

  const carregarSugestao = useCallback(() => {
    const id = ++sugestaoReqRef.current

    setEstadoSugestao('carregando')
    setMensagensErroSugestao([])

    return getSavingsSuggestion()
      .then((resposta) => {
        if (id !== sugestaoReqRef.current) return
        setSugestao(resposta?.averageMonthlySurplus ?? null)
        setEstadoSugestao('pronto')
      })
      .catch((erro) => {
        if (id !== sugestaoReqRef.current) return
        setMensagensErroSugestao(getErrorMessages(erro))
        setEstadoSugestao('erro')
      })
  }, [])

  const carregarMetas = useCallback(() => {
    const id = ++metasReqRef.current

    setEstadoMetas('carregando')
    setMensagensErroMetas([])

    return listGoals()
      .then((resposta) => {
        if (id !== metasReqRef.current) return
        setMetas(Array.isArray(resposta) ? resposta : [])
        setEstadoMetas('pronto')
      })
      .catch((erro) => {
        if (id !== metasReqRef.current) return
        setMensagensErroMetas(getErrorMessages(erro))
        setEstadoMetas('erro')
      })
  }, [])

  useEffect(() => {
    const timer = setTimeout(carregarSugestao, 0)
    return () => {
      clearTimeout(timer)
      sugestaoReqRef.current += 1
    }
  }, [carregarSugestao])

  useEffect(() => {
    const timer = setTimeout(carregarMetas, 0)
    return () => {
      clearTimeout(timer)
      metasReqRef.current += 1
    }
  }, [carregarMetas])

  function prepararValor(valorSugerido) {
    setMensagemSucesso('')
    setErroValor('')
    setMensagensErroConfirmacao([])
    setValorMeta(valorSugerido == null ? '' : formatCurrency(valorSugerido))
    setEtapa('valor')
  }

  function formatarValor() {
    const valor = parseCurrencyInput(valorMeta)
    if (valor !== null && valor > 0) {
      setValorMeta(formatCurrency(valor))
    }
  }

  function revisarValor() {
    const erro = validarValor(valorMeta)
    setErroValor(erro)
    setMensagensErroConfirmacao([])
    if (erro) return

    setValorMeta(formatCurrency(parseCurrencyInput(valorMeta)))
    setEtapa('confirmacao')
  }

  function cancelar() {
    setEtapa('inicial')
    setErroValor('')
    setMensagensErroConfirmacao([])
  }

  async function handleConfirmar() {
    if (confirmandoRef.current) return

    confirmandoRef.current = true
    setConfirmando(true)
    setMensagensErroConfirmacao([])

    try {
      await confirmGoal({ targetAmount: parseCurrencyInput(valorMeta) })
      setMensagemSucesso('Meta criada com o valor confirmado.')
      cancelar()
      carregarMetas()
    } catch (erro) {
      setMensagensErroConfirmacao(getErrorMessages(erro))
    } finally {
      confirmandoRef.current = false
      setConfirmando(false)
    }
  }

  const valorConfirmado = parseCurrencyInput(valorMeta)

  return (
    <main className="container goals">
      <nav className="goals__breadcrumb" aria-label="Trilha de navegação">
        <HomeBreadcrumbLink />
        <span aria-hidden="true">/</span>
        <span aria-current="page">Metas financeiras</span>
      </nav>

      <header className="goals__hero">
        <div className="goals__intro">
          <p className="goals__eyebrow">Planejamento e conquistas</p>
          <h1 className="goals__title">Metas financeiras</h1>
          <p className="goals__subtitle">
            Planeje uma meta a partir da sobra média da família. Nenhuma meta é criada sem sua confirmação.
          </p>
        </div>
      </header>

      {mensagemSucesso && (
        <p className="goals__success" role="status">{mensagemSucesso}</p>
      )}

      <section className="goals__section" aria-label="Sugestão de economia">
        <h2 className="goals__section-title">Sugestão de economia</h2>

        {estadoSugestao === 'carregando' && (
          <p className="goals__status" role="status">Carregando sugestão de economia...</p>
        )}

        {estadoSugestao === 'erro' && (
          <div className="goals__error" role="alert">
            {mensagensErroSugestao.map((mensagem, indice) => (
              <p key={indice}>{mensagem}</p>
            ))}
            <button type="button" className="goals__retry" onClick={carregarSugestao}>
              Tentar novamente
            </button>
          </div>
        )}

        {estadoSugestao === 'pronto' && (
          sugestao == null || sugestaoDispensada ? (
            <p className="goals__empty">
              {sugestaoDispensada
                ? 'Sugestão dispensada nesta sessão.'
                : 'Não há sugestão de economia calculada no momento.'}
            </p>
          ) : (
            <>
              <p className="goals__hint">
                Valor de referência para planejamento:
                {' '}
                <strong>{formatCurrency(sugestao)}</strong>
              </p>

              {etapa === 'inicial' && (
                <div className="goals__actions">
                  <button
                    type="button"
                    className="goals__primary"
                    onClick={() => {
                      prepararValor(sugestao)
                      setEtapa('confirmacao')
                    }}
                  >
                    Aceitar sugestão
                  </button>
                  <button
                    type="button"
                    className="goals__secondary"
                    onClick={() => prepararValor(sugestao)}
                  >
                    Ajustar valor
                  </button>
                  <button
                    type="button"
                    className="goals__secondary"
                    onClick={() => setSugestaoDispensada(true)}
                  >
                    Dispensar
                  </button>
                </div>
              )}

              {etapa === 'valor' && (
                <form
                  className="goals__form"
                  onSubmit={(evento) => {
                    evento.preventDefault()
                    revisarValor()
                  }}
                  noValidate
                >
                  <div className="goals__field">
                    <label htmlFor="goals-valor">Valor da meta</label>
                    <input
                      id="goals-valor"
                      name="valorMeta"
                      type="text"
                      inputMode="decimal"
                      value={valorMeta}
                      onChange={(evento) => {
                        setValorMeta(evento.target.value)
                        setErroValor('')
                      }}
                      onBlur={formatarValor}
                      aria-invalid={Boolean(erroValor)}
                      aria-describedby={erroValor ? 'goals-erro-valor' : undefined}
                    />
                    {erroValor && (
                      <p className="goals__field-error" id="goals-erro-valor" role="alert">
                        {erroValor}
                      </p>
                    )}
                  </div>
                  <div className="goals__actions">
                    <button type="submit" className="goals__primary">
                      Revisar valor
                    </button>
                    <button type="button" className="goals__secondary" onClick={cancelar}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {etapa === 'confirmacao' && (
                <div className="goals__confirm">
                  <p className="goals__confirm-text">
                    Valor que será cadastrado: <strong>{formatCurrency(valorConfirmado)}</strong>
                  </p>
                  {mensagensErroConfirmacao.length > 0 && (
                    <div className="goals__error" role="alert">
                      {mensagensErroConfirmacao.map((mensagem, indice) => (
                        <p key={indice}>{mensagem}</p>
                      ))}
                    </div>
                  )}
                  <div className="goals__actions">
                    <button
                      type="button"
                      className="goals__primary"
                      onClick={handleConfirmar}
                      disabled={confirmando}
                    >
                      {confirmando ? 'Criando meta...' : 'Confirmar meta'}
                    </button>
                    <button
                      type="button"
                      className="goals__secondary"
                      onClick={cancelar}
                      disabled={confirmando}
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </section>

      <section className="goals__section" aria-label="Metas cadastradas">
        <h2 className="goals__section-title">Minhas metas</h2>

        {estadoMetas === 'carregando' && (
          <p className="goals__status" role="status">Carregando metas...</p>
        )}

        {estadoMetas === 'erro' && (
          <div className="goals__error" role="alert">
            {mensagensErroMetas.map((mensagem, indice) => (
              <p key={indice}>{mensagem}</p>
            ))}
            <button type="button" className="goals__retry" onClick={carregarMetas}>
              Tentar novamente
            </button>
          </div>
        )}

        {estadoMetas === 'pronto' && (
          metas.length === 0 ? (
            <p className="goals__empty">Nenhuma meta cadastrada.</p>
          ) : (
            <ul className="goals__list" data-testid="goals-lista">
              {metas.map((meta) => (
                <li className="goals__item" key={meta.id}>
                  <span className="goals__item-value">{formatCurrency(meta.targetAmount)}</span>
                  <time className="goals__item-date" dateTime={meta.createdAt}>
                    Criada em {formatarDataHora(meta.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </main>
  )
}
