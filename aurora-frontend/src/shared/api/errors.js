export class ApiError extends Error {
  constructor({ status, erro, messages, caminho }) {
    const lista = Array.isArray(messages)
      ? messages.filter(Boolean).map(String)
      : messages
        ? [String(messages)]
        : []

    super(lista.join(' ') || erro || 'Erro na requisição.')
    this.name = 'ApiError'
    this.status = status
    this.erro = erro
    this.messages = lista
    this.caminho = caminho
  }

  static fromResponse(status, payload) {
    const data = payload && typeof payload === 'object' ? payload : {}
    const mensagens = Array.isArray(data.mensagens)
      ? data.mensagens.filter(Boolean).map(String)
      : data.mensagens
        ? [String(data.mensagens)]
        : []

    return new ApiError({
      status,
      erro: data.erro || `Erro HTTP ${status}`,
      messages: mensagens,
      caminho: data.caminho,
    })
  }
}

export function getErrorMessages(error) {
  if (error instanceof ApiError) return error.messages
  if (error instanceof Error && error.message) return [error.message]
  return ['Erro inesperado.']
}
