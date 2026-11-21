import { Link } from 'react-router-dom'

function formatarPercentual(valor) {
  if (valor == null) return ''
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return ''
  return `${numero.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

function formatarDataHora(valor) {
  const partes = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!partes) return ''

  const [, ano, mes, dia, hora, minuto] = partes
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`
}

export default function HomeIncomeAlert({ resumo }) {
  if (!resumo || resumo.thresholdReached !== true) return null

  const dataAlerta = resumo.alert ? formatarDataHora(resumo.alert.createdAt) : ''

  return (
    <section
      className="home-finance__alert"
      aria-label="Alerta de comprometimento da renda"
      role="alert"
    >
      <h2 className="home-finance__alert-title">Alerta de comprometimento da renda</h2>

      {resumo.commitmentPercent != null && (
        <p className="home-finance__alert-percent">
          Comprometimento da renda: {formatarPercentual(resumo.commitmentPercent)}
        </p>
      )}

      <p className="home-finance__alert-text">
        Limite de {formatarPercentual(resumo.alertThresholdPercent)} atingido.
        {dataAlerta && ` Registrado em ${dataAlerta}.`}
      </p>

      <Link className="home-finance__alert-link" to="/notifications">
        Ver alertas
      </Link>
    </section>
  )
}
