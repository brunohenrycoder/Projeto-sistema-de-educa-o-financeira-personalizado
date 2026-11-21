import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeBreadcrumbLink from '../../shared/components/HomeBreadcrumbLink.jsx'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency, parseCurrencyInput } from '../../shared/format/currency.js'
import { formatDate } from '../../shared/format/date.js'
import StatusFilter from '../../shared/components/StatusFilter.jsx'
import { listReceivables } from './api/listReceivables.js'
import { confirmReceivable } from './api/confirmReceivable.js'
import { updateReceivable } from './api/updateReceivable.js'
import { updateReceivableRecurrence } from './api/updateReceivableRecurrence.js'
import { cancelReceivable } from './api/cancelReceivable.js'
import { getReceivableHistory } from './api/getReceivableHistory.js'
import './ReceivablesPage.css'

const ROTULOS_STATUS = {
  PENDENTE: 'Pendente',
  RECEBIDA: 'Recebida',
  ATRASADA: 'Atrasada',
  CANCELADA: 'Cancelada',
}

const ROTULOS_RECORRENCIA = {
  SEM_RECORRENCIA: 'Sem recorrência',
  MENSAL: 'Mensal',
}

const STATUS_CONFIRMAVEIS = ['PENDENTE', 'ATRASADA']
const STATUS_EDITAVEIS = ['PENDENTE', 'ATRASADA']
const STATUS_CANCELAVEIS = ['PENDENTE', 'ATRASADA']

const GRUPOS_STATUS = {
  PENDENTE: 'pendentes',
  ATRASADA: 'pendentes',
  RECEBIDA: 'concluidas',
  CANCELADA: 'canceladas',
}

const HISTORICO_VISUALIZACOES = [
  { id: 'concluidas', rotulo: 'Recebidas' },
  { id: 'canceladas', rotulo: 'Canceladas' },
]

function rotuloStatus(status) {
  return ROTULOS_STATUS[status] ?? status ?? ''
}

function grupoStatus(status) {
  return GRUPOS_STATUS[status] ?? 'pendentes'
}

function mensagemVazia(total) {
  if (total === 0) return 'Nenhum recebimento encontrado.'
  return 'Nenhum recebimento pendente encontrado.'
}

function mensagemVaziaHistorico(visualizacao) {
  if (visualizacao === 'concluidas') return 'Nenhum recebimento recebido encontrado.'
  return 'Nenhum recebimento cancelado encontrado.'
}

function rotuloRecorrencia(recurrence) {
  return ROTULOS_RECORRENCIA[recurrence] ?? recurrence ?? ''
}

function podeEditarRecorrencia(item) {
  return item.recurrence === 'MENSAL' && STATUS_EDITAVEIS.includes(item.status)
}

function dataCoherentComDia(data, dia) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false
  const [ano, mes] = data.split('-').map(Number)
  const ultimoDia = new Date(ano, mes, 0).getDate()
  return Number(data.slice(8, 10)) === Math.min(dia, ultimoDia)
}

function formatarDataHora(valor) {
  const texto = String(valor ?? '')
  const correspondencia = texto.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!correspondencia) return formatDate(texto)

  const [, ano, mes, dia, hora, minuto] = correspondencia
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`
}

function alteracoesDoHistorico(entrada) {
  const alteracoes = []

  if (entrada.previousDescription != null && entrada.previousDescription !== entrada.description) {
    alteracoes.push({
      rotulo: 'Descrição',
      anterior: entrada.previousDescription,
      atual: entrada.description,
    })
  }

  if (
    entrada.previousExpectedAmount != null
    && Number(entrada.previousExpectedAmount) !== Number(entrada.expectedAmount)
  ) {
    alteracoes.push({
      rotulo: 'Valor esperado',
      anterior: formatCurrency(entrada.previousExpectedAmount),
      atual: formatCurrency(entrada.expectedAmount),
    })
  }

  if (entrada.previousExpectedDate != null && entrada.previousExpectedDate !== entrada.expectedDate) {
    alteracoes.push({
      rotulo: 'Data prevista',
      anterior: formatDate(entrada.previousExpectedDate),
      atual: formatDate(entrada.expectedDate),
    })
  }

  return alteracoes
}

function validarConfirmacao({ receivedDate, amount }, expectedAmount) {
  const erros = {}

  if (!receivedDate) {
    erros.receivedDate = 'A data efetiva do recebimento é obrigatória.'
  }

  if (String(amount).trim()) {
    const valor = parseCurrencyInput(amount)
    if (valor === null) {
      erros.amount = 'Informe um valor válido com até duas casas decimais.'
    } else if (Number(valor) !== Number(expectedAmount)) {
      erros.amount = 'O valor recebido deve ser igual ao valor esperado.'
    }
  }

  return erros
}

function validarEdicao({ description, expectedAmount, expectedDate }) {
  const erros = {}
  const valor = parseCurrencyInput(expectedAmount)
  const descricao = String(description).trim()

  if (!descricao) {
    erros.description = 'A descrição do recebimento é obrigatória.'
  } else if (descricao.length > 255) {
    erros.description = 'A descrição deve ter no máximo 255 caracteres.'
  }

  if (!String(expectedAmount).trim()) {
    erros.expectedAmount = 'Informe o valor esperado.'
  } else if (valor === null) {
    erros.expectedAmount = 'Informe um valor válido com até duas casas decimais.'
  } else if (valor < 0.01) {
    erros.expectedAmount = 'O valor esperado deve ser maior que zero.'
  }

  if (!expectedDate) {
    erros.expectedDate = 'A data prevista é obrigatória.'
  }

  return erros
}

function validarEdicaoRecorrencia({ description, expectedAmount, nextExpectedDate, recurrenceDay }) {
  const erros = {}
  const valor = parseCurrencyInput(expectedAmount)
  const descricao = String(description).trim()
  const dia = Number(recurrenceDay)

  if (!descricao) {
    erros.description = 'A descrição da recorrência é obrigatória.'
  } else if (descricao.length > 255) {
    erros.description = 'A descrição deve ter no máximo 255 caracteres.'
  }

  if (!String(expectedAmount).trim()) {
    erros.expectedAmount = 'Informe o valor esperado.'
  } else if (valor === null) {
    erros.expectedAmount = 'Informe um valor válido com até duas casas decimais.'
  } else if (valor < 0.01) {
    erros.expectedAmount = 'O valor esperado deve ser maior que zero.'
  } else if (Math.floor(valor).toString().length > 10) {
    erros.expectedAmount = 'O valor deve ter no máximo 10 dígitos inteiros.'
  }

  if (!nextExpectedDate) {
    erros.nextExpectedDate = 'A próxima data prevista é obrigatória.'
  }

  if (!String(recurrenceDay).trim() || !Number.isInteger(dia) || dia < 1 || dia > 31) {
    erros.recurrenceDay = 'O dia de recorrência deve estar entre 1 e 31.'
  } else if (nextExpectedDate && !dataCoherentComDia(nextExpectedDate, dia)) {
    erros.nextExpectedDate = 'A data prevista deve corresponder ao dia de recorrência informado.'
  }

  return erros
}

function ListaRecebimentos({ itens, sufixo, onConfirmar, onEditar, onEditarRecorrencia, onCancelar, onHistorico }) {
    return (
      <>
        <div className="receivables__table-scroll">
          <table className="receivables__table" data-testid={`receivables-tabela${sufixo}`}>
            <thead>
              <tr>
                <th scope="col">Descrição</th>
                <th scope="col" className="receivables__cell--amount">Valor esperado</th>
                <th scope="col">Data prevista</th>
                <th scope="col">Recorrência</th>
                <th scope="col">Ocorrência</th>
                <th scope="col">Status</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td className="receivables__cell--amount">{formatCurrency(item.expectedAmount)}</td>
                  <td>
                    {formatDate(item.expectedDate)}
                    {item.status === 'RECEBIDA' && item.receivedDate && (
                      <span className="receivables__effective-date">
                        Efetiva: {formatDate(item.receivedDate)}
                      </span>
                    )}
                  </td>
                  <td>{rotuloRecorrencia(item.recurrence)}</td>
                  <td>{item.occurrenceNumber}</td>
                  <td>
                    <span
                      className={`receivables__status-tag receivables__status-tag--${item.status}`}
                      data-status={item.status}
                    >
                      {rotuloStatus(item.status)}
                    </span>
                  </td>
                  <td>
                    <div className="receivables__actions">
                      {STATUS_CONFIRMAVEIS.includes(item.status) && (
                        <button
                          type="button"
                          className="receivables__confirm-button"
                          aria-label="Confirmar recebimento"
                          onClick={() => onConfirmar(item)}
                        >
                          Confirmar
                        </button>
                      )}
                      {STATUS_EDITAVEIS.includes(item.status) && (
                        <button
                          type="button"
                          className="receivables__edit-button"
                          onClick={() => onEditar(item)}
                        >
                          Editar
                        </button>
                      )}
                      {podeEditarRecorrencia(item) && (
                        <button
                          type="button"
                          className="receivables__edit-button"
                          onClick={() => onEditarRecorrencia(item)}
                        >
                          Editar recorrência
                        </button>
                      )}
                      {STATUS_CANCELAVEIS.includes(item.status) && (
                        <button
                          type="button"
                          className="receivables__cancel-button"
                          onClick={() => onCancelar(item)}
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        className="receivables__history-button"
                        onClick={() => onHistorico(item)}
                      >
                        Histórico
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="receivables__mobile-list" data-testid={`receivables-cards${sufixo}`}>
          {itens.map((item) => (
            <li className={`receivables__item-card receivables__item-card--${item.status}`} key={item.id}>
              <p className="receivables__item-description">{item.description}</p>
              <p className="receivables__item-value">{formatCurrency(item.expectedAmount)}</p>
              <dl className="receivables__item-details">
                <dt>Data prevista</dt>
                <dd>{formatDate(item.expectedDate)}</dd>
                {item.status === 'RECEBIDA' && item.receivedDate && (
                  <>
                    <dt>Data efetiva</dt>
                    <dd>{formatDate(item.receivedDate)}</dd>
                  </>
                )}
                <dt>Recorrência</dt>
                <dd>{rotuloRecorrencia(item.recurrence)}</dd>
                <dt>Ocorrência</dt>
                <dd>{item.occurrenceNumber}</dd>
                <dt>Status</dt>
                <dd>
                  <span
                    className={`receivables__status-tag receivables__status-tag--${item.status}`}
                    data-status={item.status}
                  >
                    {rotuloStatus(item.status)}
                  </span>
                </dd>
              </dl>
              <div className="receivables__actions">
                {STATUS_CONFIRMAVEIS.includes(item.status) && (
                  <button
                    type="button"
                    className="receivables__confirm-button receivables__action-button--card"
                    aria-label="Confirmar recebimento"
                    onClick={() => onConfirmar(item)}
                  >
                    Confirmar
                  </button>
                )}
                {STATUS_EDITAVEIS.includes(item.status) && (
                  <button
                    type="button"
                    className="receivables__edit-button receivables__action-button--card"
                    onClick={() => onEditar(item)}
                  >
                    Editar
                  </button>
                )}
                {podeEditarRecorrencia(item) && (
                  <button
                    type="button"
                    className="receivables__edit-button receivables__action-button--card"
                    onClick={() => onEditarRecorrencia(item)}
                  >
                    Editar recorrência
                  </button>
                )}
                {STATUS_CANCELAVEIS.includes(item.status) && (
                  <button
                    type="button"
                    className="receivables__cancel-button receivables__action-button--card"
                    onClick={() => onCancelar(item)}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  className="receivables__history-button receivables__action-button--card"
                  onClick={() => onHistorico(item)}
                >
                  Histórico
                </button>
              </div>
            </li>
          ))}
        </ul>
      </>
    )
  }

export default function ReceivablesPage() {
  const navigate = useNavigate()
  const [estado, setEstado] = useState('carregando')
  const [recebimentos, setRecebimentos] = useState([])
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [visualizacaoHistorico, setVisualizacaoHistorico] = useState('concluidas')
  const [mensagensErro, setMensagensErro] = useState([])
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const [painelAtivo, setPainelAtivo] = useState(null)
  const [formConfirmacao, setFormConfirmacao] = useState({ receivedDate: '', amount: '' })
  const [errosConfirmacao, setErrosConfirmacao] = useState({})
  const [mensagensErroConfirmacao, setMensagensErroConfirmacao] = useState([])
  const [confirmando, setConfirmando] = useState(false)
  const confirmandoRef = useRef(false)
  const [formEdicao, setFormEdicao] = useState({ description: '', expectedAmount: '', expectedDate: '' })
  const [errosEdicao, setErrosEdicao] = useState({})
  const [mensagensErroEdicao, setMensagensErroEdicao] = useState([])
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const salvandoEdicaoRef = useRef(false)
  const [formRecorrencia, setFormRecorrencia] = useState({
    description: '', expectedAmount: '', nextExpectedDate: '', recurrenceDay: '',
  })
  const [errosRecorrencia, setErrosRecorrencia] = useState({})
  const [mensagensErroRecorrencia, setMensagensErroRecorrencia] = useState([])
  const [salvandoRecorrencia, setSalvandoRecorrencia] = useState(false)
  const salvandoRecorrenciaRef = useRef(false)
  const [cancelando, setCancelando] = useState(false)
  const [mensagensErroCancelamento, setMensagensErroCancelamento] = useState([])
  const cancelandoRef = useRef(false)
  const [estadoHistorico, setEstadoHistorico] = useState('carregando')
  const [entradasHistorico, setEntradasHistorico] = useState([])
  const [confirmacaoHistorico, setConfirmacaoHistorico] = useState(null)
  const [mensagensErroHistorico, setMensagensErroHistorico] = useState([])
  const historicoRef = useRef(0)
  const requisicaoAtualRef = useRef(0)
  const ultimoFocoRef = useRef(null)

  const confirmandoId = painelAtivo?.tipo === 'confirmacao' ? painelAtivo.id : null
  const editandoId = painelAtivo?.tipo === 'edicao' ? painelAtivo.id : null
  const editandoRecorrenciaId = painelAtivo?.tipo === 'edicaoRecorrencia' ? painelAtivo.id : null
  const cancelandoId = painelAtivo?.tipo === 'cancelamento' ? painelAtivo.id : null
  const historicoId = painelAtivo?.tipo === 'historico' ? painelAtivo.id : null

  function abrirPainel(tipo, id) {
    if (!painelAtivo && document.activeElement instanceof HTMLElement) {
      ultimoFocoRef.current = document.activeElement
    }
    setMensagemSucesso('')
    setPainelAtivo({ tipo, id })
  }

  function fecharPainel() {
    setPainelAtivo(null)
  }

  const carregar = useCallback(() => {
    const id = ++requisicaoAtualRef.current

    setEstado('carregando')
    setMensagensErro([])

    return listReceivables()
      .then((resposta) => {
        if (id !== requisicaoAtualRef.current) return
        setRecebimentos(Array.isArray(resposta?.receivables) ? resposta.receivables : [])
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

  useEffect(() => {
    if (!painelAtivo) {
      const anterior = ultimoFocoRef.current
      if (anterior?.isConnected) anterior.focus()
      return
    }
    document.getElementById(`painel-${painelAtivo.tipo}`)?.focus()
  }, [painelAtivo])

  useEffect(() => {
    if (!painelAtivo) return undefined

    function aoTeclado(evento) {
      if (evento.key !== 'Escape') return
      if (painelAtivo.tipo === 'historico') historicoRef.current += 1
      setPainelAtivo(null)
      if (painelAtivo.tipo === 'confirmacao') {
        setErrosConfirmacao({})
        setMensagensErroConfirmacao([])
      } else if (painelAtivo.tipo === 'edicao') {
        setErrosEdicao({})
        setMensagensErroEdicao([])
      } else if (painelAtivo.tipo === 'edicaoRecorrencia') {
        setErrosRecorrencia({})
        setMensagensErroRecorrencia([])
      } else if (painelAtivo.tipo === 'cancelamento') {
        setMensagensErroCancelamento([])
      }
    }

    document.addEventListener('keydown', aoTeclado)
    return () => document.removeEventListener('keydown', aoTeclado)
  }, [painelAtivo])

  function abrirConfirmacao(item) {
    if (!STATUS_CONFIRMAVEIS.includes(item.status)) return
    setMensagensErroConfirmacao([])
    setErrosConfirmacao({})
    setFormConfirmacao({ receivedDate: '', amount: '' })
    abrirPainel('confirmacao', item.id)
  }

  function cancelarConfirmacao() {
    fecharPainel()
    setErrosConfirmacao({})
    setMensagensErroConfirmacao([])
  }

  function atualizarCampoConfirmacao(evento) {
    const { name, value } = evento.target
    setFormConfirmacao((anterior) => ({ ...anterior, [name]: value }))
  }

  function formatarValorConfirmacao() {
    const valor = parseCurrencyInput(formConfirmacao.amount)
    if (valor !== null && valor > 0) {
      setFormConfirmacao((anterior) => ({ ...anterior, amount: formatCurrency(valor) }))
    }
  }

  const itemEmConfirmacao = recebimentos.find((item) => item.id === confirmandoId)

  async function handleConfirmacao(evento) {
    evento.preventDefault()
    if (confirmandoRef.current || !confirmandoId || !itemEmConfirmacao) return

    const errosEncontrados = validarConfirmacao(formConfirmacao, itemEmConfirmacao.expectedAmount)
    setErrosConfirmacao(errosEncontrados)
    setMensagensErroConfirmacao([])
    if (Object.keys(errosEncontrados).length > 0) return

    confirmandoRef.current = true
    setConfirmando(true)

    const valor = formConfirmacao.amount.trim()
    const payload = {
      receivedDate: formConfirmacao.receivedDate,
      ...(valor ? { amount: parseCurrencyInput(valor) } : {}),
    }

    try {
      await confirmReceivable(confirmandoId, payload)
      setMensagemSucesso('Recebimento confirmado.')
      fecharPainel()
      carregar()
    } catch (erro) {
      setMensagensErroConfirmacao(getErrorMessages(erro))
    } finally {
      confirmandoRef.current = false
      setConfirmando(false)
    }
  }

  function abrirEdicao(item) {
    if (!STATUS_EDITAVEIS.includes(item.status)) return
    setMensagensErroEdicao([])
    setErrosEdicao({})
    setFormEdicao({
      description: item.description ?? '',
      expectedAmount: formatCurrency(item.expectedAmount),
      expectedDate: item.expectedDate ?? '',
    })
    abrirPainel('edicao', item.id)
  }

  function cancelarEdicao() {
    fecharPainel()
    setErrosEdicao({})
    setMensagensErroEdicao([])
  }

  function atualizarCampoEdicao(evento) {
    const { name, value } = evento.target
    setFormEdicao((anterior) => ({ ...anterior, [name]: value }))
  }

  function formatarValorEdicao() {
    const valor = parseCurrencyInput(formEdicao.expectedAmount)
    if (valor !== null && valor > 0) {
      setFormEdicao((anterior) => ({ ...anterior, expectedAmount: formatCurrency(valor) }))
    }
  }

  const itemEmEdicao = recebimentos.find((item) => item.id === editandoId)

  async function handleSalvarEdicao(evento) {
    evento.preventDefault()
    if (salvandoEdicaoRef.current || !editandoId || !itemEmEdicao) return

    const errosEncontrados = validarEdicao(formEdicao)
    setErrosEdicao(errosEncontrados)
    setMensagensErroEdicao([])
    if (Object.keys(errosEncontrados).length > 0) return

    salvandoEdicaoRef.current = true
    setSalvandoEdicao(true)

    const payload = {
      description: formEdicao.description.trim(),
      expectedAmount: parseCurrencyInput(formEdicao.expectedAmount),
      expectedDate: formEdicao.expectedDate,
    }

    try {
      const resposta = await updateReceivable(editandoId, payload)
      setRecebimentos((anterior) =>
        anterior.map((item) => (item.id === editandoId ? { ...item, ...resposta } : item)),
      )
      setMensagemSucesso('Recebimento atualizado.')
      fecharPainel()
      carregar()
    } catch (erro) {
      setMensagensErroEdicao(getErrorMessages(erro))
    } finally {
      salvandoEdicaoRef.current = false
      setSalvandoEdicao(false)
    }
  }

  function abrirEdicaoRecorrencia(item) {
    if (!podeEditarRecorrencia(item)) return
    setMensagensErroRecorrencia([])
    setErrosRecorrencia({})
    setFormRecorrencia({
      description: item.description ?? '',
      expectedAmount: formatCurrency(item.expectedAmount),
      nextExpectedDate: item.expectedDate ?? '',
      recurrenceDay: item.expectedDate ? String(Number(item.expectedDate.slice(8, 10))) : '',
    })
    abrirPainel('edicaoRecorrencia', item.id)
  }

  function cancelarEdicaoRecorrencia() {
    fecharPainel()
    setErrosRecorrencia({})
    setMensagensErroRecorrencia([])
  }

  function atualizarCampoRecorrencia(evento) {
    const { name, value } = evento.target
    setFormRecorrencia((anterior) => ({ ...anterior, [name]: value }))
  }

  function formatarValorRecorrencia() {
    const valor = parseCurrencyInput(formRecorrencia.expectedAmount)
    if (valor !== null && valor > 0) {
      setFormRecorrencia((anterior) => ({ ...anterior, expectedAmount: formatCurrency(valor) }))
    }
  }

  const itemEmEdicaoRecorrencia = recebimentos.find((item) => item.id === editandoRecorrenciaId)

  async function handleSalvarRecorrencia(evento) {
    evento.preventDefault()
    if (salvandoRecorrenciaRef.current || !editandoRecorrenciaId || !itemEmEdicaoRecorrencia) return

    const errosEncontrados = validarEdicaoRecorrencia(formRecorrencia)
    setErrosRecorrencia(errosEncontrados)
    setMensagensErroRecorrencia([])
    if (Object.keys(errosEncontrados).length > 0) return

    salvandoRecorrenciaRef.current = true
    setSalvandoRecorrencia(true)

    const payload = {
      description: formRecorrencia.description.trim(),
      expectedAmount: parseCurrencyInput(formRecorrencia.expectedAmount),
      nextExpectedDate: formRecorrencia.nextExpectedDate,
      recurrenceDay: Number(formRecorrencia.recurrenceDay),
    }

    try {
      const resposta = await updateReceivableRecurrence(editandoRecorrenciaId, payload)
      const quantidade = Number(resposta?.updatedOccurrences ?? 0)
      setMensagemSucesso(
        `Recorrência atualizada. ${quantidade} ocorrência(ões) futura(s) atualizada(s).`,
      )
      fecharPainel()
      carregar()
    } catch (erro) {
      setMensagensErroRecorrencia(getErrorMessages(erro))
    } finally {
      salvandoRecorrenciaRef.current = false
      setSalvandoRecorrencia(false)
    }
  }

  function abrirCancelamento(item) {
    if (!STATUS_CANCELAVEIS.includes(item.status)) return
    setMensagensErroCancelamento([])
    abrirPainel('cancelamento', item.id)
  }

  function fecharCancelamento() {
    fecharPainel()
    setMensagensErroCancelamento([])
  }

  async function confirmarCancelamento(item, scope) {
    if (cancelandoRef.current || !item) return

    cancelandoRef.current = true
    setCancelando(true)
    setMensagensErroCancelamento([])

    try {
      await cancelReceivable(item.id, { scope })
      setMensagemSucesso('Recebimento cancelado.')
      fecharPainel()
      carregar()
    } catch (erro) {
      setMensagensErroCancelamento(getErrorMessages(erro))
    } finally {
      cancelandoRef.current = false
      setCancelando(false)
    }
  }

  function carregarHistorico(receivableId) {
    const id = ++historicoRef.current
    setEstadoHistorico('carregando')
    setMensagensErroHistorico([])

    return getReceivableHistory(receivableId)
      .then((resposta) => {
        if (id !== historicoRef.current) return
        setEntradasHistorico(Array.isArray(resposta?.history) ? resposta.history : [])
        setConfirmacaoHistorico(resposta?.confirmation ?? null)
        setEstadoHistorico('pronto')
      })
      .catch((erro) => {
        if (id !== historicoRef.current) return
        setMensagensErroHistorico(getErrorMessages(erro))
        setEstadoHistorico('erro')
      })
  }

  function abrirHistorico(item) {
    setEntradasHistorico([])
    setConfirmacaoHistorico(null)
    abrirPainel('historico', item.id)
    carregarHistorico(item.id)
  }

  function fecharHistorico() {
    historicoRef.current += 1
    fecharPainel()
    setMensagensErroHistorico([])
  }

  const itemEmCancelamento = recebimentos.find((item) => item.id === cancelandoId)
  const itemDoHistorico = recebimentos.find((item) => item.id === historicoId)
  const atrasados = estado === 'pronto'
    ? recebimentos.filter((item) => item.status === 'ATRASADA').length
    : 0

  const contadores = useMemo(() => ({
    pendentes: recebimentos.filter((item) => grupoStatus(item.status) === 'pendentes').length,
    concluidas: recebimentos.filter((item) => grupoStatus(item.status) === 'concluidas').length,
    canceladas: recebimentos.filter((item) => grupoStatus(item.status) === 'canceladas').length,
  }), [recebimentos])

  const indicadores = useMemo(() => {
    const recebidos = recebimentos.filter((item) => item.status === 'RECEBIDA')
    const pendentes = recebimentos.filter((item) => item.status === 'PENDENTE' || item.status === 'ATRASADA')
    const soma = (itens) => itens.reduce((total, item) => total + Number(item.expectedAmount ?? 0), 0)

    return {
      recebido: soma(recebidos),
      quantidadeRecebidos: recebidos.length,
      aReceber: soma(pendentes),
      quantidadePendentes: pendentes.length,
    }
  }, [recebimentos])

  const itensPendentes = useMemo(
    () => recebimentos.filter((item) => grupoStatus(item.status) === 'pendentes'),
    [recebimentos],
  )

  const itensHistorico = useMemo(
    () => recebimentos.filter((item) => grupoStatus(item.status) === visualizacaoHistorico),
    [recebimentos, visualizacaoHistorico],
  )

  function alternarHistorico() {
    if (historicoAberto) {
      setHistoricoAberto(false)
      setVisualizacaoHistorico('concluidas')
    } else {
      setHistoricoAberto(true)
    }
  }

  return (
    <main className="container receivables">
      <nav className="receivables__breadcrumb" aria-label="Trilha de navegação">
        <HomeBreadcrumbLink />
        <span aria-hidden="true">/</span>
        <span aria-current="page">Contas a receber</span>
      </nav>

      <header className="receivables__hero">
        <div className="receivables__intro">
          <p className="receivables__eyebrow">Acompanhamento de entradas</p>
          <h1 className="receivables__title">Contas a receber</h1>
          <p className="receivables__subtitle">
            Acompanhe os valores que a família espera receber.
          </p>
        </div>
        <button
          className="receivables__register"
          type="button"
          onClick={() => navigate('/receivables/new')}
        >
          Cadastrar recebimento
        </button>
      </header>

      {mensagemSucesso && (
        <p className="receivables__success" role="status">
          {mensagemSucesso}
        </p>
      )}

      {estado === 'pronto' && (
        <section className="receivables__indicators" aria-label="Indicadores de contas a receber">
          <article className="receivables__indicator">
            <p className="receivables__indicator-label">Recebido no período</p>
            <p className="receivables__indicator-value">{formatCurrency(indicadores.recebido)}</p>
            <p className="receivables__indicator-detail">
              {indicadores.quantidadeRecebidos} recebimentos registrados
            </p>
          </article>
          <article className="receivables__indicator receivables__indicator--destaque">
            <p className="receivables__indicator-label">A receber</p>
            <p className="receivables__indicator-value">{formatCurrency(indicadores.aReceber)}</p>
            <p className="receivables__indicator-detail">
              {indicadores.quantidadePendentes} valores pendentes
            </p>
          </article>
          <article className="receivables__indicator">
            <p className="receivables__indicator-label">Próximas entradas</p>
            <p className="receivables__indicator-value">{indicadores.quantidadePendentes}</p>
            <p className="receivables__indicator-detail">Recebimentos previstos</p>
          </article>
        </section>
      )}

      {estado === 'carregando' && (
        <p className="receivables__status" role="status">
          Carregando contas a receber...
        </p>
      )}

      {estado === 'erro' && (
        <div className="receivables__error" role="alert">
          {mensagensErro.map((mensagem, indice) => (
            <p key={indice}>{mensagem}</p>
          ))}
          <button type="button" className="receivables__retry" onClick={carregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {estado === 'pronto' && (
        <>
          {atrasados > 0 && (
            <p className="receivables__alert" role="status">
              {atrasados} {atrasados === 1 ? 'recebimento atrasado' : 'recebimentos atrasados'}
            </p>
          )}

          <section className="receivables__card">
            <h2 className="receivables__card-title">Recebimentos do grupo familiar</h2>

            {itensPendentes.length === 0 ? (
              <p className="receivables__empty">
                {mensagemVazia(recebimentos.length)}
              </p>
            ) : (
              <ListaRecebimentos
                itens={itensPendentes}
                sufixo=""
                onConfirmar={abrirConfirmacao}
                onEditar={abrirEdicao}
                onEditarRecorrencia={abrirEdicaoRecorrencia}
                onCancelar={abrirCancelamento}
                onHistorico={abrirHistorico}
              />
            )}
          </section>

          <button
            type="button"
            className="receivables__history-toggle"
            data-testid="receivables-historico-toggle"
            aria-label="Histórico de operações"
            aria-expanded={historicoAberto}
            aria-controls="receivables-historico"
            onClick={alternarHistorico}
          >
            Histórico
            <span className="receivables__history-count" aria-hidden="true">
              {contadores.concluidas + contadores.canceladas}
            </span>
          </button>

          {historicoAberto && (
            <section
              id="receivables-historico"
              className="receivables__history"
              aria-label="Histórico de recebimentos"
            >
              <StatusFilter
                label="Filtrar histórico por status"
                options={HISTORICO_VISUALIZACOES.map((opcao) => ({
                  ...opcao,
                  quantidade: contadores[opcao.id],
                }))}
                value={visualizacaoHistorico}
                onChange={setVisualizacaoHistorico}
              />

              {itensHistorico.length === 0 ? (
                <p className="receivables__empty">
                  {mensagemVaziaHistorico(visualizacaoHistorico)}
                </p>
              ) : (
                <ListaRecebimentos
                  itens={itensHistorico}
                  sufixo="-historico"
                  onConfirmar={abrirConfirmacao}
                  onEditar={abrirEdicao}
                  onCancelar={abrirCancelamento}
                  onHistorico={abrirHistorico}
                />
              )}
            </section>
          )}

        </>
      )}

      {estado === 'pronto' && itemDoHistorico && (
        <section
          className="receivables__confirm-form"
          aria-label="Histórico do recebimento"
          id="painel-historico"
          tabIndex={-1}
        >
          <div className="receivables__history-head">
            <h3 className="receivables__confirm-title">Histórico do recebimento</h3>
            <button
              type="button"
              className="receivables__confirm-cancel"
              onClick={fecharHistorico}
            >
              Fechar
            </button>
          </div>
          <p className="receivables__confirm-expected">
            {itemDoHistorico.description} · Ocorrência {itemDoHistorico.occurrenceNumber}
          </p>

          {estadoHistorico === 'carregando' && (
            <p className="receivables__status" role="status">Carregando histórico...</p>
          )}

          {estadoHistorico === 'erro' && (
            <div className="receivables__error" role="alert">
              {mensagensErroHistorico.map((mensagem, indice) => (
                <p key={indice}>{mensagem}</p>
              ))}
              <button
                type="button"
                className="receivables__retry"
                onClick={() => carregarHistorico(itemDoHistorico.id)}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {estadoHistorico === 'pronto' && (
            <div data-testid="historico-recebimento">
              {entradasHistorico.length === 0 && !confirmacaoHistorico ? (
                <p className="receivables__empty">Nenhum registro de histórico encontrado.</p>
              ) : (
                <>
                  {confirmacaoHistorico && (
                    <div className="receivables__history-item">
                      <p className="receivables__history-title">Confirmação</p>
                      <dl className="receivables__history-details">
                        <dt>Valor recebido</dt>
                        <dd>{formatCurrency(confirmacaoHistorico.amount)}</dd>
                        <dt>Data prevista</dt>
                        <dd>{formatDate(confirmacaoHistorico.expectedDate)}</dd>
                        <dt>Data efetiva</dt>
                        <dd>{formatDate(confirmacaoHistorico.receivedDate)}</dd>
                        <dt>Recebido por</dt>
                        <dd>{confirmacaoHistorico.receivedBy}</dd>
                      </dl>
                    </div>
                  )}

                  <ul className="receivables__history-list">
                    {entradasHistorico.map((entrada) => {
                      const alteracoes = alteracoesDoHistorico(entrada)

                      return (
                        <li className="receivables__history-item" key={entrada.id}>
                          <p className="receivables__history-title">
                            {entrada.previousStatus ? rotuloStatus(entrada.previousStatus) : '—'} → {rotuloStatus(entrada.status)}
                          </p>
                          <dl className="receivables__history-details">
                            <dt>Data</dt>
                            <dd>{formatarDataHora(entrada.changedAt)}</dd>
                            <dt>Alterado por</dt>
                            <dd>{entrada.changedBy}</dd>
                            {alteracoes.length > 0 ? (
                              <>
                                <dt>Alterações</dt>
                                <dd>
                                  <ul className="receivables__history-changes">
                                    {alteracoes.map((alteracao) => (
                                      <li key={alteracao.rotulo}>
                                        <span className="receivables__change-label">{alteracao.rotulo}:</span>{' '}
                                        {alteracao.anterior} → {alteracao.atual}
                                      </li>
                                    ))}
                                  </ul>
                                </dd>
                              </>
                            ) : (
                              <>
                                <dt>Descrição</dt>
                                <dd>{entrada.description}</dd>
                                <dt>Valor esperado</dt>
                                <dd>{formatCurrency(entrada.expectedAmount)}</dd>
                                <dt>Data prevista</dt>
                                <dd>{formatDate(entrada.expectedDate)}</dd>
                              </>
                            )}
                          </dl>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {estado === 'pronto' && itemEmCancelamento && (
        <section
          className="receivables__cancel-confirm"
          aria-label="Cancelar recebimento"
          id="painel-cancelamento"
          tabIndex={-1}
        >
          <p className="receivables__confirm-title">Cancelar recebimento</p>
          <p className="receivables__confirm-expected">
            {itemEmCancelamento.description} · {formatCurrency(itemEmCancelamento.expectedAmount)} · Ocorrência {itemEmCancelamento.occurrenceNumber}
          </p>
          <p className="receivables__confirm-text">
            Escolha o alcance do cancelamento:
          </p>

          {mensagensErroCancelamento.length > 0 && (
            <div className="receivables__error" role="alert">
              {mensagensErroCancelamento.map((mensagem, indice) => (
                <p key={indice}>{mensagem}</p>
              ))}
            </div>
          )}

          <div className="receivables__confirm-actions">
            <div className="receivables__cancel-option">
              <button
                type="button"
                className="receivables__cancel-confirm-button"
                disabled={cancelando}
                onClick={() => confirmarCancelamento(itemEmCancelamento, 'SOMENTE_OCORRENCIA')}
              >
                {cancelando ? 'Cancelando...' : 'Cancelar somente esta ocorrência'}
              </button>
              <p className="receivables__confirm-text">
                Cancela apenas este recebimento. As demais ocorrências da série permanecem ativas.
              </p>
            </div>
            <div className="receivables__cancel-option">
              <button
                type="button"
                className="receivables__cancel-confirm-button"
                disabled={cancelando}
                onClick={() => confirmarCancelamento(itemEmCancelamento, 'OCORRENCIA_E_FUTURAS')}
              >
                {cancelando ? 'Cancelando...' : 'Cancelar esta e futuras'}
              </button>
              <p className="receivables__confirm-text">
                Cancela este recebimento e todas as ocorrências futuras ainda não recebidas da mesma série, encerrando a recorrência.
              </p>
            </div>
            <button
              type="button"
              className="receivables__confirm-cancel"
              disabled={cancelando}
              onClick={fecharCancelamento}
            >
              Voltar
            </button>
          </div>
        </section>
      )}

      {estado === 'pronto' && itemEmEdicao && (
        <section
          className="receivables__confirm-form"
          aria-label="Editar recebimento"
          id="painel-edicao"
          tabIndex={-1}
        >
          <h3 className="receivables__confirm-title">Editar recebimento</h3>
          <p className="receivables__confirm-expected">
            {itemEmEdicao.description} · Ocorrência {itemEmEdicao.occurrenceNumber}
          </p>

          <form onSubmit={handleSalvarEdicao} noValidate>
            <div className="receivables__confirm-field">
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
                <p className="receivables__confirm-error" id="edicao-erro-description" role="alert">
                  {errosEdicao.description}
                </p>
              )}
            </div>

            <div className="receivables__confirm-field">
              <label htmlFor="edicao-expectedAmount">Valor esperado</label>
              <input
                id="edicao-expectedAmount"
                name="expectedAmount"
                type="text"
                inputMode="decimal"
                value={formEdicao.expectedAmount}
                onChange={atualizarCampoEdicao}
                onBlur={formatarValorEdicao}
                aria-invalid={Boolean(errosEdicao.expectedAmount)}
                aria-describedby={errosEdicao.expectedAmount ? 'edicao-erro-expectedAmount' : undefined}
              />
              {errosEdicao.expectedAmount && (
                <p className="receivables__confirm-error" id="edicao-erro-expectedAmount" role="alert">
                  {errosEdicao.expectedAmount}
                </p>
              )}
            </div>

            <div className="receivables__confirm-field">
              <label htmlFor="edicao-expectedDate">Data prevista</label>
              <input
                id="edicao-expectedDate"
                name="expectedDate"
                type="date"
                value={formEdicao.expectedDate}
                onChange={atualizarCampoEdicao}
                aria-invalid={Boolean(errosEdicao.expectedDate)}
                aria-describedby={errosEdicao.expectedDate ? 'edicao-erro-expectedDate' : undefined}
              />
              {errosEdicao.expectedDate && (
                <p className="receivables__confirm-error" id="edicao-erro-expectedDate" role="alert">
                  {errosEdicao.expectedDate}
                </p>
              )}
            </div>

            {mensagensErroEdicao.length > 0 && (
              <div className="receivables__error" role="alert">
                {mensagensErroEdicao.map((mensagem, indice) => (
                  <p key={indice}>{mensagem}</p>
                ))}
              </div>
            )}

            <div className="receivables__confirm-actions">
              <button type="submit" className="receivables__confirm-submit" disabled={salvandoEdicao}>
                {salvandoEdicao ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                className="receivables__confirm-cancel"
                onClick={cancelarEdicao}
                disabled={salvandoEdicao}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {estado === 'pronto' && itemEmEdicaoRecorrencia && (
        <section
          className="receivables__confirm-form"
          aria-label="Editar recorrência"
          id="painel-edicaoRecorrencia"
          tabIndex={-1}
        >
          <h3 className="receivables__confirm-title">Editar recorrência</h3>
          <p className="receivables__confirm-expected">
            {itemEmEdicaoRecorrencia.description} · Recorrência mensal
          </p>
          <p className="receivables__confirm-expected">
            A alteração aplica-se somente às ocorrências futuras ainda não recebidas ou canceladas.
          </p>

          <form onSubmit={handleSalvarRecorrencia} noValidate>
            <div className="receivables__confirm-field">
              <label htmlFor="recorrencia-description">Descrição da recorrência</label>
              <input
                id="recorrencia-description"
                name="description"
                type="text"
                value={formRecorrencia.description}
                onChange={atualizarCampoRecorrencia}
                aria-invalid={Boolean(errosRecorrencia.description)}
                aria-describedby={errosRecorrencia.description ? 'recorrencia-erro-description' : undefined}
              />
              {errosRecorrencia.description && (
                <p className="receivables__confirm-error" id="recorrencia-erro-description" role="alert">
                  {errosRecorrencia.description}
                </p>
              )}
            </div>

            <div className="receivables__confirm-field">
              <label htmlFor="recorrencia-expectedAmount">Valor esperado</label>
              <input
                id="recorrencia-expectedAmount"
                name="expectedAmount"
                type="text"
                inputMode="decimal"
                value={formRecorrencia.expectedAmount}
                onChange={atualizarCampoRecorrencia}
                onBlur={formatarValorRecorrencia}
                aria-invalid={Boolean(errosRecorrencia.expectedAmount)}
                aria-describedby={errosRecorrencia.expectedAmount ? 'recorrencia-erro-expectedAmount' : undefined}
              />
              {errosRecorrencia.expectedAmount && (
                <p className="receivables__confirm-error" id="recorrencia-erro-expectedAmount" role="alert">
                  {errosRecorrencia.expectedAmount}
                </p>
              )}
            </div>

            <div className="receivables__confirm-field">
              <label htmlFor="recorrencia-nextExpectedDate">Próxima data prevista</label>
              <input
                id="recorrencia-nextExpectedDate"
                name="nextExpectedDate"
                type="date"
                value={formRecorrencia.nextExpectedDate}
                onChange={atualizarCampoRecorrencia}
                aria-invalid={Boolean(errosRecorrencia.nextExpectedDate)}
                aria-describedby={errosRecorrencia.nextExpectedDate ? 'recorrencia-erro-nextExpectedDate' : undefined}
              />
              {errosRecorrencia.nextExpectedDate && (
                <p className="receivables__confirm-error" id="recorrencia-erro-nextExpectedDate" role="alert">
                  {errosRecorrencia.nextExpectedDate}
                </p>
              )}
            </div>

            <div className="receivables__confirm-field">
              <label htmlFor="recorrencia-recurrenceDay">Dia de recorrência</label>
              <input
                id="recorrencia-recurrenceDay"
                name="recurrenceDay"
                type="number"
                min="1"
                max="31"
                value={formRecorrencia.recurrenceDay}
                onChange={atualizarCampoRecorrencia}
                aria-invalid={Boolean(errosRecorrencia.recurrenceDay)}
                aria-describedby={errosRecorrencia.recurrenceDay ? 'recorrencia-erro-recurrenceDay' : undefined}
              />
              {errosRecorrencia.recurrenceDay && (
                <p className="receivables__confirm-error" id="recorrencia-erro-recurrenceDay" role="alert">
                  {errosRecorrencia.recurrenceDay}
                </p>
              )}
            </div>

            {mensagensErroRecorrencia.length > 0 && (
              <div className="receivables__error" role="alert">
                {mensagensErroRecorrencia.map((mensagem, indice) => (
                  <p key={indice}>{mensagem}</p>
                ))}
              </div>
            )}

            <div className="receivables__confirm-actions">
              <button type="submit" className="receivables__confirm-submit" disabled={salvandoRecorrencia}>
                {salvandoRecorrencia ? 'Salvando...' : 'Salvar recorrência'}
              </button>
              <button
                type="button"
                className="receivables__confirm-cancel"
                onClick={cancelarEdicaoRecorrencia}
                disabled={salvandoRecorrencia}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {estado === 'pronto' && itemEmConfirmacao && (
        <section
          className="receivables__confirm-form"
          aria-label="Confirmar recebimento"
          id="painel-confirmacao"
          tabIndex={-1}
        >
          <h3 className="receivables__confirm-title">Confirmar recebimento</h3>
          <p className="receivables__confirm-expected">
            {itemEmConfirmacao.description} · Valor esperado: {formatCurrency(itemEmConfirmacao.expectedAmount)}
          </p>

          <form onSubmit={handleConfirmacao} noValidate>
            <div className="receivables__confirm-field">
              <label htmlFor="confirmacao-data">Data efetiva do recebimento</label>
              <input
                id="confirmacao-data"
                name="receivedDate"
                type="date"
                value={formConfirmacao.receivedDate}
                onChange={atualizarCampoConfirmacao}
                aria-invalid={Boolean(errosConfirmacao.receivedDate)}
                aria-describedby={errosConfirmacao.receivedDate ? 'erro-confirmacao-data' : undefined}
              />
              {errosConfirmacao.receivedDate && (
                <p className="receivables__confirm-error" id="erro-confirmacao-data" role="alert">
                  {errosConfirmacao.receivedDate}
                </p>
              )}
            </div>

            <div className="receivables__confirm-field">
              <label htmlFor="confirmacao-valor">Valor recebido (opcional)</label>
              <input
                id="confirmacao-valor"
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder="Deixe em branco para usar o valor esperado"
                value={formConfirmacao.amount}
                onChange={atualizarCampoConfirmacao}
                onBlur={formatarValorConfirmacao}
                aria-invalid={Boolean(errosConfirmacao.amount)}
                aria-describedby={errosConfirmacao.amount ? 'erro-confirmacao-valor' : undefined}
              />
              {errosConfirmacao.amount && (
                <p className="receivables__confirm-error" id="erro-confirmacao-valor" role="alert">
                  {errosConfirmacao.amount}
                </p>
              )}
            </div>

            {mensagensErroConfirmacao.length > 0 && (
              <div className="receivables__error" role="alert">
                {mensagensErroConfirmacao.map((mensagem, indice) => (
                  <p key={indice}>{mensagem}</p>
                ))}
              </div>
            )}

            <div className="receivables__confirm-actions">
              <button type="submit" className="receivables__confirm-submit" disabled={confirmando}>
                {confirmando ? 'Confirmando...' : 'Confirmar recebimento'}
              </button>
              <button
                type="button"
                className="receivables__confirm-cancel"
                onClick={cancelarConfirmacao}
                disabled={confirmando}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <footer className="receivables__page-footer">Aurora</footer>
    </main>
  )
}
