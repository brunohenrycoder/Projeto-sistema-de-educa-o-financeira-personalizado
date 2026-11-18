const SESSION_KEY = 'aurora.session'

export function saveSession(data) {
  if (!data || typeof data.accessToken !== 'string' || !data.accessToken) return null

  const expiresIn = Number(data.expiresIn)
  const segundos = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 0

  const session = {
    accessToken: data.accessToken,
    tokenType: data.tokenType || 'Bearer',
    expiresIn: segundos,
    userId: data.userId,
    familyGroupId: data.familyGroupId,
    name: data.name,
    email: data.email,
    role: data.role,
    expiresAt: Date.now() + segundos * 1000,
  }

  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }

  return session
}

export function readSession() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null

    const session = JSON.parse(raw)
    if (!session || typeof session.accessToken !== 'string' || typeof session.expiresAt !== 'number') {
      return null
    }

    return session
  } catch {
    return null
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(SESSION_KEY)
  }
}

export function isSessionExpired(session) {
  if (!session) return true
  return Date.now() >= session.expiresAt
}

export function hasRole(session, ...roles) {
  return Boolean(session && roles.includes(session.role))
}
