import './StatusFilter.css'

export default function StatusFilter({ label, options, value, onChange }) {
  return (
    <div className="status-filter" role="group" aria-label={label}>
      {options.map((opcao) => (
        <button
          key={opcao.id}
          type="button"
          className="status-filter__button"
          aria-pressed={value === opcao.id}
          onClick={() => onChange(opcao.id)}
        >
          <span>{opcao.rotulo}</span>
          <span className="status-filter__count" aria-hidden="true">
            {opcao.quantidade}
          </span>
        </button>
      ))}
    </div>
  )
}
