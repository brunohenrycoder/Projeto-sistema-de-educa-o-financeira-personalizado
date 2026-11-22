import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessages } from '../../shared/api/errors.js'
import { formatCurrency, parseCurrencyInput } from '../../shared/format/currency.js'
import { registerExpense } from './api/registerExpense.js'
import './RegisterExpensePage.css'

const FORMULARIO_INICIAL = {
  amount: '',
  expenseDate: '',
  category: '',
  paymentMethod: '',
  description: '',
  installmentCount: '1',
}

const FORMAS_PAGAMENTO = [
  { value: 'DINHEIRO', rotulo: 'Dinheiro' },
  { value: 'PIX', rotulo: 'Pix' },
  { value: 'CARTAO_DEBITO', rotulo: 'Cartão de débito' },
  { value: 'CARTAO_CREDITO', rotulo: 'Cartão de crédito' },
  { value: 'TRANSFERENCIA', rotulo: 'Transferência' },
  { value: 'OUTRO', rotulo: 'Outro' },
]

function validar({ amount, expenseDate, category, paymentMethod, description, installmentCount }) {
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

  if (!paymentMethod) {
    erros.paymentMethod = 'Informe a forma de pagamento.'
  }

  if (String(description).length > 255) {
    erros.description = 'A descrição deve ter no máximo 255 caracteres.'
  }

  if (paymentMethod === 'CARTAO_CREDITO') {
    const parcelas = Number(installmentCount)
    if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 36) {
      erros.installmentCount = 'A compra deve ter de 1 a 36 parcelas.'
    }
  } else if (String(installmentCount) !== '' && String(installmentCount) !== '1') {
    erros.installmentCount = 'O parcelamento só pode ser informado para despesas no cartão de crédito.'
  }

  return erros
}

export default function RegisterExpensePage() {
  const navigate = useNavigate()
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [erros, setErros] = useState({})
  const [mensagensApi, setMensagensApi] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const enviandoRef = useRef(false)

  function atualizarCampo(evento) {
    const { name, value } = evento.target

    setFormulario((anterior) => {
      if (name === 'paymentMethod' && value !== 'CARTAO_CREDITO') {
        return { ...anterior, [name]: value, installmentCount: '1' }
      }
      return { ...anterior, [name]: value }
    })
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

    const descricao = formulario.description.trim()
    const payload = {
      amount: parseCurrencyInput(formulario.amount),
      expenseDate: formulario.expenseDate,
      category: formulario.category.trim(),
      paymentMethod: formulario.paymentMethod,
      ...(descricao ? { description: descricao } : {}),
      ...(formulario.paymentMethod === 'CARTAO_CREDITO'
        ? { installmentCount: Number(formulario.installmentCount) }
        : {}),
    }

    try {
      await registerExpense(payload)
      setSucesso(true)
    } catch (erro) {
      setMensagensApi(getErrorMessages(erro))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  const exibirParcelamento = formulario.paymentMethod === 'CARTAO_CREDITO'

  function campo(name, label, elemento) {
    const erro = erros[name]
    const variante = name === 'amount'
      ? ' register-expense__field--amount'
      : name === 'installmentCount'
        ? ' register-expense__field--condicional'
        : ''

    return (
      <div className={`register-expense__field${variante}`}>
        <label className="register-expense__label" htmlFor={name}>
          {label}
        </label>
        {elemento}
        {erro && (
          <p className="register-expense__error" id={`erro-${name}`} role="alert">
            {erro}
          </p>
        )}
      </div>
    )
  }

  return (
    <main className="container register-expense">
      <header className="register-expense__hero">
        <h1 className="register-expense__title">Registrar despesa</h1>
      </header>

      {sucesso ? (
        <section className="register-expense__success" role="status">
          <p>Despesa registrada.</p>
          <button
            className="register-expense__submit"
            type="button"
            onClick={() => navigate('/expenses')}
          >
            Voltar para a listagem
          </button>
        </section>
      ) : (
        <form className="register-expense__form" onSubmit={handleSubmit} noValidate>
        {campo('amount', 'Valor', (
          <input
            className="register-expense__input"
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

        {campo('expenseDate', 'Data da despesa', (
          <input
            className="register-expense__input"
            id="expenseDate"
            name="expenseDate"
            type="date"
            value={formulario.expenseDate}
            onChange={atualizarCampo}
            aria-invalid={Boolean(erros.expenseDate)}
            aria-describedby={erros.expenseDate ? 'erro-expenseDate' : undefined}
          />
        ))}

        {campo('category', 'Categoria', (
          <input
            className="register-expense__input"
            id="category"
            name="category"
            type="text"
            value={formulario.category}
            onChange={atualizarCampo}
            aria-invalid={Boolean(erros.category)}
            aria-describedby={erros.category ? 'erro-category' : undefined}
          />
        ))}

        {campo('paymentMethod', 'Forma de pagamento', (
          <select
            className="register-expense__input"
            id="paymentMethod"
            name="paymentMethod"
            value={formulario.paymentMethod}
            onChange={atualizarCampo}
            aria-invalid={Boolean(erros.paymentMethod)}
            aria-describedby={erros.paymentMethod ? 'erro-paymentMethod' : undefined}
          >
            <option value="">Selecione a forma de pagamento</option>
            {FORMAS_PAGAMENTO.map((forma) => (
              <option key={forma.value} value={forma.value}>
                {forma.rotulo}
              </option>
            ))}
          </select>
        ))}

        {exibirParcelamento && campo('installmentCount', 'Parcelas', (
          <select
            className="register-expense__input"
            id="installmentCount"
            name="installmentCount"
            value={formulario.installmentCount}
            onChange={atualizarCampo}
            aria-invalid={Boolean(erros.installmentCount)}
            aria-describedby={erros.installmentCount ? 'erro-installmentCount' : undefined}
          >
            {Array.from({ length: 36 }, (_, indice) => indice + 1).map((parcelas) => (
              <option key={parcelas} value={String(parcelas)}>
                {parcelas}
              </option>
            ))}
          </select>
        ))}

        {campo('description', 'Descrição', (
          <input
            className="register-expense__input"
            id="description"
            name="description"
            type="text"
            value={formulario.description}
            onChange={atualizarCampo}
            aria-invalid={Boolean(erros.description)}
            aria-describedby={erros.description ? 'erro-description' : undefined}
          />
        ))}

          {mensagensApi.length > 0 && (
            <div className="register-expense__api-errors" role="alert">
              {mensagensApi.map((mensagem, indice) => (
                <p key={indice}>{mensagem}</p>
              ))}
            </div>
          )}

          <button className="register-expense__submit" type="submit" disabled={enviando}>
            {enviando ? 'Cadastrando...' : 'Cadastrar despesa'}
          </button>
        </form>
      )}
    </main>
  )
}
