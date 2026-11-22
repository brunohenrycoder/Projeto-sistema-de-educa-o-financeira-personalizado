import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeBreadcrumbLink from '../../shared/components/HomeBreadcrumbLink.jsx'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency, parseCurrencyInput } from '../../shared/format/currency.js'
import { createPayableBill } from './api/createPayableBill.js'
import './RegisterPayableBillPage.css'

const FORMULARIO_INICIAL = {
  description: '',
  amount: '',
  dueDate: '',
  category: '',
  recurrence: '',
}

const CATEGORIAS = [
  'MORADIA',
  'ALIMENTACAO',
  'TRANSPORTE',
  'SAUDE',
  'EDUCACAO',
  'LAZER',
  'CONTAS_CONSUMO',
  'ASSINATURAS',
  'IMPOSTOS',
  'OUTROS',
]

const RECORRENCIAS = [
  { value: 'SEM_RECORRENCIA', rotulo: 'Sem recorrência' },
  { value: 'MENSAL', rotulo: 'Mensal' },
]

function validar({ description, amount, dueDate, category, recurrence }) {
  const erros = {}
  const valor = parseCurrencyInput(amount)
  const descricao = String(description).trim()

  if (!descricao) {
    erros.description = 'A descrição da conta é obrigatória.'
  } else if (descricao.length > 255) {
    erros.description = 'A descrição deve ter no máximo 255 caracteres.'
  }

  if (!String(amount).trim()) {
    erros.amount = 'Informe o valor da conta.'
  } else if (valor === null) {
    erros.amount = 'Informe um valor válido com até duas casas decimais.'
  } else if (valor < 0.01) {
    erros.amount = 'O valor da conta deve ser maior que zero.'
  }

  if (!dueDate) {
    erros.dueDate = 'A data de vencimento é obrigatória.'
  }

  if (!category) {
    erros.category = 'A categoria é obrigatória.'
  } else if (!CATEGORIAS.includes(category)) {
    erros.category = 'Selecione uma categoria válida.'
  }

  if (!recurrence) {
    erros.recurrence = 'A recorrência é obrigatória.'
  } else if (!RECORRENCIAS.some((opcao) => opcao.value === recurrence)) {
    erros.recurrence = 'Selecione uma recorrência válida.'
  }

  return erros
}

export default function RegisterPayableBillPage() {
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
    const valor = parseCurrencyInput(formulario.amount)
    if (valor !== null && valor > 0) {
      setFormulario((anterior) => ({ ...anterior, amount: formatCurrency(valor) }))
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
      amount: parseCurrencyInput(formulario.amount),
      dueDate: formulario.dueDate,
      category: formulario.category,
      recurrence: formulario.recurrence,
    }

    try {
      await createPayableBill(payload)
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
    const variante = name === 'amount' ? ' register-bill__field--amount' : ''

    return (
      <div className={`register-bill__field${variante}`}>
        <label className="register-bill__label" htmlFor={name}>
          {label}
        </label>
        {elemento}
        {erro && (
          <p className="register-bill__error" id={`erro-${name}`} role="alert">
            {erro}
          </p>
        )}
      </div>
    )
  }

  return (
    <main className="container register-bill">
      <nav className="register-bill__breadcrumb" aria-label="Trilha de navegação">
        <HomeBreadcrumbLink />
        <span aria-hidden="true">/</span>
        <span>Contas a pagar</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Nova conta</span>
      </nav>

      <header className="register-bill__hero">
        <h1 className="register-bill__title">Cadastrar conta a pagar</h1>
        <p className="register-bill__subtitle">
          Informe os dados da conta prevista para o grupo familiar.
        </p>
      </header>

      {sucesso ? (
        <section className="register-bill__success" role="status">
          <p>Conta a pagar cadastrada.</p>
          <button
            className="register-bill__submit"
            type="button"
            onClick={() => navigate('/payable-bills')}
          >
            Voltar para a listagem
          </button>
        </section>
      ) : (
        <form className="register-bill__form" onSubmit={handleSubmit} noValidate>
          {campo('description', 'Descrição', (
            <input
              className="register-bill__input"
              id="description"
              name="description"
              type="text"
              value={formulario.description}
              onChange={atualizarCampo}
              aria-invalid={Boolean(erros.description)}
              aria-describedby={erros.description ? 'erro-description' : undefined}
            />
          ))}

          {campo('amount', 'Valor', (
            <input
              className="register-bill__input"
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={formulario.amount}
              onChange={atualizarCampo}
              onBlur={formatarValor}
              aria-invalid={Boolean(erros.amount)}
              aria-describedby={erros.amount ? 'erro-amount' : undefined}
            />
          ))}

          {campo('dueDate', 'Data de vencimento', (
            <input
              className="register-bill__input"
              id="dueDate"
              name="dueDate"
              type="date"
              value={formulario.dueDate}
              onChange={atualizarCampo}
              aria-invalid={Boolean(erros.dueDate)}
              aria-describedby={erros.dueDate ? 'erro-dueDate' : undefined}
            />
          ))}

          {campo('category', 'Categoria', (
            <select
              className="register-bill__input"
              id="category"
              name="category"
              value={formulario.category}
              onChange={atualizarCampo}
              aria-invalid={Boolean(erros.category)}
              aria-describedby={erros.category ? 'erro-category' : undefined}
            >
              <option value="">Selecione a categoria</option>
              {CATEGORIAS.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          ))}

          {campo('recurrence', 'Recorrência', (
            <select
              className="register-bill__input"
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
            <div className="register-bill__api-errors" role="alert">
              {mensagensApi.map((mensagem, indice) => (
                <p key={indice}>{mensagem}</p>
              ))}
            </div>
          )}

          <button className="register-bill__submit" type="submit" disabled={enviando}>
            {enviando ? 'Cadastrando...' : 'Cadastrar conta'}
          </button>
        </form>
      )}
    </main>
  )
}
