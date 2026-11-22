import { formatCurrency } from '../../shared/format/currency.js'

export default function HomeFinancialSummary({ resumo, periodo }) {
  return (
    <section className="home-finance__summary" aria-label="Resumo financeiro">
      <div className="home-finance__summary-head">
        <h2 className="home-finance__title">Resumo financeiro</h2>
        <p className="home-finance__period-label">Período: {periodo}</p>
      </div>

      <div className="home-finance__cards">
        <article className="home-finance__card">
          <h3 className="home-finance__card-label">Saldo previsto</h3>
          <p className="home-finance__card-value">
            {formatCurrency(resumo.projectedBalance)}
          </p>
        </article>
        <article className="home-finance__card">
          <h3 className="home-finance__card-label">Entradas previstas</h3>
          <p className="home-finance__card-value">
            {formatCurrency(resumo.plannedIncome)}
          </p>
        </article>
        <article className="home-finance__card">
          <h3 className="home-finance__card-label">Saídas previstas</h3>
          <p className="home-finance__card-value">
            {formatCurrency(resumo.plannedExpenses)}
          </p>
        </article>
      </div>
    </section>
  )
}
