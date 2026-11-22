import { BANDEIRAS } from './creditCardForm.js'

export default function CreditCardForm({ formulario, erros, onChange, onBlurLimite, idPrefix = 'cartao', desabilitado = false }) {
  function campo(nome, rotulo, elemento) {
    const erro = erros[nome]
    return (
      <div className="credit-cards__field">
        <label className="credit-cards__label" htmlFor={`${idPrefix}-${nome}`}>{rotulo}</label>
        {elemento}
        {erro && (
          <p className="credit-cards__field-error" id={`${idPrefix}-erro-${nome}`} role="alert">
            {erro}
          </p>
        )}
      </div>
    )
  }

  const descritoPor = (nome) => (erros[nome] ? `${idPrefix}-erro-${nome}` : undefined)

  return (
    <div className="credit-cards__form-grid">
      {campo('name', 'Nome do cartão', (
        <input
          id={`${idPrefix}-name`}
          name="name"
          type="text"
          maxLength={100}
          value={formulario.name}
          onChange={onChange}
          disabled={desabilitado}
          aria-invalid={Boolean(erros.name)}
          aria-describedby={descritoPor('name')}
        />
      ))}

      {campo('issuer', 'Banco emissor', (
        <input
          id={`${idPrefix}-issuer`}
          name="issuer"
          type="text"
          maxLength={100}
          value={formulario.issuer}
          onChange={onChange}
          disabled={desabilitado}
          aria-invalid={Boolean(erros.issuer)}
          aria-describedby={descritoPor('issuer')}
        />
      ))}

      {campo('network', 'Bandeira', (
        <select
          id={`${idPrefix}-network`}
          name="network"
          value={formulario.network}
          onChange={onChange}
          disabled={desabilitado}
          aria-invalid={Boolean(erros.network)}
          aria-describedby={descritoPor('network')}
        >
          <option value="">Selecione a bandeira</option>
          {BANDEIRAS.map((opcao) => (
            <option key={opcao.value} value={opcao.value}>{opcao.rotulo}</option>
          ))}
        </select>
      ))}

      {formulario.network === 'OUTRA' && campo('otherNetworkName', 'Identificação da bandeira', (
        <input
          id={`${idPrefix}-otherNetworkName`}
          name="otherNetworkName"
          type="text"
          minLength={2}
          maxLength={40}
          value={formulario.otherNetworkName}
          onChange={onChange}
          disabled={desabilitado}
          aria-invalid={Boolean(erros.otherNetworkName)}
          aria-describedby={descritoPor('otherNetworkName')}
        />
      ))}

      {campo('lastFourDigits', 'Últimos quatro dígitos (opcional)', (
        <input
          id={`${idPrefix}-lastFourDigits`}
          name="lastFourDigits"
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={formulario.lastFourDigits}
          onChange={onChange}
          disabled={desabilitado}
          aria-invalid={Boolean(erros.lastFourDigits)}
          aria-describedby={descritoPor('lastFourDigits')}
        />
      ))}

      {campo('totalLimit', 'Limite total', (
        <input
          id={`${idPrefix}-totalLimit`}
          name="totalLimit"
          type="text"
          inputMode="decimal"
          value={formulario.totalLimit}
          onChange={onChange}
          onBlur={onBlurLimite}
          disabled={desabilitado}
          aria-invalid={Boolean(erros.totalLimit)}
          aria-describedby={descritoPor('totalLimit')}
        />
      ))}

      {campo('closingDay', 'Dia de fechamento', (
        <input
          id={`${idPrefix}-closingDay`}
          name="closingDay"
          type="number"
          min={1}
          max={28}
          value={formulario.closingDay}
          onChange={onChange}
          disabled={desabilitado}
          aria-invalid={Boolean(erros.closingDay)}
          aria-describedby={descritoPor('closingDay')}
        />
      ))}

      {campo('dueDay', 'Dia de vencimento', (
        <input
          id={`${idPrefix}-dueDay`}
          name="dueDay"
          type="number"
          min={1}
          max={28}
          value={formulario.dueDay}
          onChange={onChange}
          disabled={desabilitado}
          aria-invalid={Boolean(erros.dueDay)}
          aria-describedby={descritoPor('dueDay')}
        />
      ))}
    </div>
  )
}
