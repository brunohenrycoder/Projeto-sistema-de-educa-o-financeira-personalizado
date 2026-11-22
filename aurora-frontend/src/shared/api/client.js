import { ApiError } from './errors.js'

const DEFAULT_BASE_URL = 'http://localhost:8080'
const LOGIN_PATH = '/api/auth/login'

let unauthorizedHandler = null
let tokenProvider = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null
}

export function setTokenProvider(provider) {
  tokenProvider = typeof provider === 'function' ? provider : null
}

function resolveToken(explicitToken) {
  if (explicitToken !== undefined && explicitToken !== null) return explicitToken
  return typeof tokenProvider === 'function' ? tokenProvider() || null : null
}

export function getApiBaseUrl() {
  const configurado = import.meta.env?.VITE_API_BASE_URL
  return typeof configurado === 'string' && configurado.trim()
    ? configurado.trim().replace(/\/+$/, '')
    : DEFAULT_BASE_URL
}

export function normalizeApiPath(path) {
  const valor = String(path ?? '').trim()
  if (!valor) throw new Error('Caminho da API é obrigatório.')

  const comBarra = valor.startsWith('/') ? valor : `/${valor}`
  if (comBarra === '/api' || comBarra.startsWith('/api/')) return comBarra
  return `/api${comBarra}`
}

export function buildApiUrl(path) {
  return `${getApiBaseUrl()}${normalizeApiPath(path)}`
}

function buildHeaders({ headers, body, token }) {
  const result = new Headers(headers || {})

  if (body !== undefined && body !== null && !result.has('Content-Type')) {
    result.set('Content-Type', 'application/json')
  }
  if (token && !result.has('Authorization')) {
    result.set('Authorization', `Bearer ${token}`)
  }

  return result
}

async function readPayload(response) {
  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function request(path, options = {}) {
  const apiPath = normalizeApiPath(path)
  const { method = 'GET', body, token, headers, signal } = options

  const init = {
    method,
    headers: buildHeaders({ headers, body, token: resolveToken(token) }),
    signal,
  }
  if (body !== undefined && body !== null) {
    init.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(buildApiUrl(path), init)
  } catch {
    throw new ApiError({
      status: 0,
      erro: 'Erro de comunicação',
      messages: ['Não foi possível comunicar com o servidor.'],
      caminho: apiPath,
    })
  }

  const payload = await readPayload(response)

  if (response.status === 401 && apiPath !== LOGIN_PATH) {
    unauthorizedHandler?.()
  }

  if (!response.ok) {
    throw ApiError.fromResponse(response.status, payload)
  }

  return payload
}
