import { describe, expect, it } from 'vitest'
import { ApiError, getErrorMessages } from './errors.js'

describe('ApiError', () => {
  it('normaliza mensagens em array e preserva os campos', () => {
    const erro = new ApiError({
      status: 400,
      erro: 'Dados inválidos',
      messages: ['Campo obrigatório', 'Valor inválido'],
      caminho: '/api/auth/register',
    })

    expect(erro).toMatchObject({
      name: 'ApiError',
      status: 400,
      erro: 'Dados inválidos',
      messages: ['Campo obrigatório', 'Valor inválido'],
      caminho: '/api/auth/register',
      message: 'Campo obrigatório Valor inválido',
    })
  })

  it('aceita mensagem escalar', () => {
    const erro = new ApiError({ status: 401, messages: 'E-mail ou senha inválidos.' })
    expect(erro.messages).toEqual(['E-mail ou senha inválidos.'])
  })

  it('remove mensagens vazias', () => {
    const erro = new ApiError({ status: 400, messages: ['a', '', null, 'b'] })
    expect(erro.messages).toEqual(['a', 'b'])
  })

  it('usa erro como fallback quando mensagens estão ausentes', () => {
    const erro = new ApiError({ status: 500, erro: 'Erro interno' })
    expect(erro.messages).toEqual([])
    expect(erro.message).toBe('Erro interno')
  })

  it('usa texto padrão quando mensagens e erro estão ausentes', () => {
    const erro = new ApiError({ status: 0 })
    expect(erro.messages).toEqual([])
    expect(erro.message).toBe('Erro na requisição.')
  })
})

describe('ApiError.fromResponse', () => {
  it('preserva um payload completo', () => {
    const erro = ApiError.fromResponse(409, {
      status: 409,
      erro: 'Conflito de dados',
      mensagens: ['Já existe um usuário cadastrado com este e-mail.'],
      caminho: '/api/auth/register',
    })

    expect(erro).toMatchObject({
      status: 409,
      erro: 'Conflito de dados',
      messages: ['Já existe um usuário cadastrado com este e-mail.'],
      caminho: '/api/auth/register',
    })
  })

  it('converte mensagem escalar em array', () => {
    const mensagem = 'Não foi possível enviar o e-mail de confirmação. Tente novamente mais tarde.'
    const erro = ApiError.fromResponse(503, { mensagens: mensagem })
    expect(erro.messages).toEqual([mensagem])
  })

  it('filtra mensagens vazias', () => {
    const erro = ApiError.fromResponse(400, { mensagens: ['a', '', 'b'] })
    expect(erro.messages).toEqual(['a', 'b'])
  })

  it('preenche erro padrão e mensagens vazias quando payload não traz dados', () => {
    const erro = ApiError.fromResponse(500, {})
    expect(erro.erro).toBe('Erro HTTP 500')
    expect(erro.messages).toEqual([])
  })

  it('aceita payload nulo sem lançar exceção', () => {
    const erro = ApiError.fromResponse(400, null)
    expect(erro.status).toBe(400)
    expect(erro.messages).toEqual([])
    expect(erro.erro).toBe('Erro HTTP 400')
  })
})

describe('getErrorMessages', () => {
  it('retorna messages de ApiError', () => {
    const erro = new ApiError({ status: 400, messages: ['a', 'b'] })
    expect(getErrorMessages(erro)).toEqual(['a', 'b'])
  })

  it('retorna a mensagem de um Error comum', () => {
    expect(getErrorMessages(new Error('falha de rede'))).toEqual(['falha de rede'])
  })

  it('retorna fallback para Error sem mensagem', () => {
    expect(getErrorMessages(new Error(''))).toEqual(['Erro inesperado.'])
  })

  it('retorna fallback para valor inesperado', () => {
    expect(getErrorMessages({})).toEqual(['Erro inesperado.'])
  })
})
