export default function HomePeriodFilter({ opcao, onChange }) {
  return (
    <section className="home-finance__filter" aria-label="Filtro de período">
      <button
        type="button"
        className="home-finance__period"
        aria-pressed={opcao === 'atual'}
        onClick={() => onChange('atual')}
      >
        Este mês
      </button>
      <button
        type="button"
        className="home-finance__period"
        aria-pressed={opcao === 'anterior'}
        onClick={() => onChange('anterior')}
      >
        Mês anterior
      </button>
    </section>
  )
}
