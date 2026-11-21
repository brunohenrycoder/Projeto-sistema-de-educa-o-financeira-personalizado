import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeBreadcrumbLink from '../../shared/components/HomeBreadcrumbLink.jsx'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency, parseCurrencyInput } from '../../shared/format/currency.js'
import { createReceivable } from './api/createReceivable.js'
import './RegisterReceivablePage.css'

const FORMULARIO_INICIAL = {
  description: '',
  expectedAmount: '',
  expectedDate: '',
  recurrence: '',
}

const RECORRENCIAS = [
  { value: 'SEM_RECORRENCIA', rotulo: 'Sem recorrência' },
  { value: 'MENSAL', rotulo: 'Mensal' },
]

function validar({ description, expectedAmount, expectedDate, recurrence }) {
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

  if (!recurrence) {
    erros.recurrence = 'A recorrência é obrigatória.'
  } else if (!RECORRENCIAS.some((opcao) => opcao.value === recurrence)) {
    erros.recurrence = 'Selecione uma recorrência válida.'
  }

  return erros
}

export default function RegisterReceivablePage() {
  const navigate = useNavigate()
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [erros, setErros] = useState({})
  const [mensagensApi, setMensagensApi] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const enviandoRef = useRef(false)

  function atualizarCampo(evento) {
    const { name, value } = evento.target
    setFormulario((anterior) => ({ ...anterior, [name]: value }))
  }

  function formatarValor() {
    const valor = parseCurrencyInput(formulario.expectedAmount)
    if (valor !== null && valor > 0) {
      setFormulario((anterior) => ({
        ...anterior,
        expectedAmount: formatCurrency(valor),
      }))
    }
  }

  async function handleSubmit(evento) {
    evento.preventDefault()
    if (enviandoRef.current) return

    const errosEncontrados = validar(formulario)
    setErros(errosEncontrados)
    setMensagensApi([])
    setSucesso(false)
    if (Object.keys(errosEncontrados).length > 0) return

    enviandoRef.current = true
    setEnviando(true)

    const payload = {
      description: formulario.description.trim(),
      expectedAmount: parseCurrencyInput(formulario.expectedAmount),
      expectedDate: formulario.expectedDate,
      recurrence: formulario.recurrence,
    }

    try {
      await createReceivable(payload)
      setSucesso(true)
    } catch (erro) {
      setMensagensApi(getErrorMessages(erro))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  function campo(name, label, elemento) {
    const erro = erros[name]
    const variante = name === 'expectedAmount' ? ' register-receivable__field--amount' : ''

    return (
      <div className={`register-receivable__field${variante}`}>
        <label className="register-receivable__label" htmlFor={name}>
          {label}
        </label>
        {elemento}
        {erro && (
          <p className="register-receivable__error" id={`erro-${name}`} role="alert">
            {erro}
          </p>
        )}
      </div>
    )
  }

  return (
    <main className="container register-receivable">
      <nav className="register-receivable__breadcrumb" aria-label="Trilha de navegação">
        <HomeBreadcrumbLink />
        <span aria-hidden="true">/</span>
        <span>Contas a receber</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Novo recebimento</span>
      </nav>

      <header className="register-receivable__hero">
        <h1 className="register-receivable__title">Cadastrar recebimento</h1>
        <p className="register-receivable__subtitle">
          Informe os dados do valor que a família espera receber.
        </p>
      </header>

      {sucesso ? (
        <section className="register-receivable__success" role="status">
          <p>Recebimento cadastrado.</p>
          <button
            className="register-receivable__submit"
            type="button"
            onClick={() => navigate('/receivables')}
          >
            Voltar para a listagem
          </button>
        </section>
      ) : (
        <form className="register-receivable__form" onSubmit={handleSubmit} noValidate>
          {campo('description', 'Descrição', (
            <input
              className="register-receivable__input"
              id="description"
              name="description"
              type="text"
              value={formulario.description}
              onChange={atualizarCampo}
              aria-invalid={Boolean(erros.description)}
              aria-describedby={erros.description ? 'erro-description' : undefined}
            />
          ))}

          {campo('expectedAmount', 'Valor esperado', (
            <input
              className="register-receivable__input"
              id="expectedAmount"
              name="expectedAmount"
              type="text"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={formulario.expectedAmount}
              onChange={atualizarCampo}
              onBlur={formatarValor}
              aria-invalid={Boolean(erros.expectedAmount)}
              aria-describedby={erros.expectedAmount ? 'erro-expectedAmount' : undefined}
            />
          ))}

          {campo('expectedDate', 'Data prevista', (
            <input
              className="register-receivable__input"
              id="expectedDate"
              name="expectedDate"
              type="date"
              value={formulario.expectedDate}
              onChange={atualizarCampo}
              aria-invalid={Boolean(erros.expectedDate)}
              aria-describedby={erros.expectedDate ? 'erro-expectedDate' : undefined}
            />
          ))}

          {campo('recurrence', 'Recorrência', (
            <select
              className="register-receivable__input"
              id="recurrence"
              name="recurrence"
              value={formulario.recurrence}
              onChange={atualizarCampo}
              aria-invalid={Boolean(erros.recurrence)}
              aria-describedby={erros.recurrence ? 'erro-recurrence' : undefined}
            >
              <option value="">Selecione a recorrência</option>
              {RECORRENCIAS.map((opcao) => (
                <option key={opcao.value} value={opcao.value}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          ))}

          {mensagensApi.length > 0 && (
            <div className="register-receivable__api-errors" role="alert">
              {mensagensApi.map((mensagem, indice) => (
                <p key={indice}>{mensagem}</p>
              ))}
            </div>
          )}

          <button className="register-receivable__submit" type="submit" disabled={enviando}>
            {enviando ? 'Cadastrando...' : 'Cadastrar recebimento'}
          </button>
        </form>
      )}
    </main>
  )
}
