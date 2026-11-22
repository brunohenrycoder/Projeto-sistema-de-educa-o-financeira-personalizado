import { formatCurrency, parseCurrencyInput } from '../../shared/format/currency.js'

export const BANDEIRAS = [
  { value: 'VISA', rotulo: 'Visa' },
  { value: 'MASTERCARD', rotulo: 'Mastercard' },
  { value: 'ELO', rotulo: 'Elo' },
  { value: 'AMERICAN_EXPRESS', rotulo: 'American Express' },
  { value: 'HIPERCARD', rotulo: 'Hipercard' },
  { value: 'OUTRA', rotulo: 'Outra' },
]

export function formularioInicial(cartao = null) {
  return {
    name: cartao?.name ?? '',
    issuer: cartao?.issuer ?? '',
    network: cartao?.network ?? '',
    otherNetworkName: cartao?.otherNetworkName ?? '',
    lastFourDigits: cartao?.lastFourDigits ?? '',
    totalLimit: cartao?.totalLimit == null ? '' : formatCurrency(cartao.totalLimit),
    closingDay: cartao?.closingDay == null ? '' : String(cartao.closingDay),
    dueDay: cartao?.dueDay == null ? '' : String(cartao.dueDay),
  }
}

function dia(valor) {
  if (String(valor).trim() === '') return null
  const numero = Number(valor)
  return Number.isInteger(numero) ? numero : null
}

export function validarCartao(formulario) {
  const erros = {}
  const nome = String(formulario.name).trim()
  const emissor = String(formulario.issuer).trim()
  const bandeira = String(formulario.network).trim()
  const bandeiraOutra = String(formulario.otherNetworkName).trim()
  const digitos = String(formulario.lastFourDigits).trim()
  const limite = parseCurrencyInput(formulario.totalLimit)
  const fechamento = dia(formulario.closingDay)
  const vencimento = dia(formulario.dueDay)

  if (!nome) {
    erros.name = 'O nome do cartão é obrigatório.'
  } else if (nome.length > 100) {
    erros.name = 'O nome do cartão deve ter no máximo 100 caracteres.'
  }

  if (!emissor) {
    erros.issuer = 'O banco emissor é obrigatório.'
  } else if (emissor.length > 100) {
    erros.issuer = 'O banco emissor deve ter no máximo 100 caracteres.'
  }

  if (!BANDEIRAS.some((opcao) => opcao.value === bandeira)) {
    erros.network = 'Selecione uma bandeira válida.'
  }

  if (bandeira === 'OUTRA') {
    if (bandeiraOutra.length < 2 || bandeiraOutra.length > 40) {
      erros.otherNetworkName = 'Informe a identificação da bandeira, com 2 a 40 caracteres.'
    }
  }

  if (digitos && !/^\d{4}$/.test(digitos)) {
    erros.lastFourDigits = 'Informe exatamente os quatro últimos números.'
  }

  if (!String(formulario.totalLimit).trim()) {
    erros.totalLimit = 'Informe o limite total.'
  } else if (limite === null) {
    erros.totalLimit = 'Informe um limite válido com até duas casas decimais.'
  } else if (limite < 0.01) {
    erros.totalLimit = 'O limite total deve ser maior que zero.'
  }

  if (fechamento === null || fechamento < 1 || fechamento > 28) {
    erros.closingDay = 'O dia de fechamento deve estar entre 1 e 28.'
  }

  if (vencimento === null || vencimento < 1 || vencimento > 28) {
    erros.dueDay = 'O dia de vencimento deve estar entre 1 e 28.'
  }

  return erros
}

export function payloadCartao(formulario) {
  return {
    name: String(formulario.name).trim(),
    issuer: String(formulario.issuer).trim(),
    network: formulario.network,
    otherNetworkName: formulario.network === 'OUTRA'
      ? String(formulario.otherNetworkName).trim()
      : null,
    lastFourDigits: String(formulario.lastFourDigits).trim() || null,
    totalLimit: parseCurrencyInput(formulario.totalLimit),
    closingDay: Number(formulario.closingDay),
    dueDay: Number(formulario.dueDay),
  }
}
