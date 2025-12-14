import type { User } from './models'

// Storage shape: we persist the backend User object and (optionally) the access token string
type StoredUser = {
  user: User
  accessToken?: string
}

const USER_STORAGE_KEY = 'user'
const ANONYMOUS_USER_ID_KEY = 'userId'

type AuthenticatedVariant = Extract<User, { authenticated: unknown }>
type AnonymousVariant = Extract<User, { anonymous: unknown }>

function isAuthenticated(u: User): u is AuthenticatedVariant {
  return 'authenticated' in u
}

function isAnonymous(u: User): u is AnonymousVariant {
  return 'anonymous' in u
}

function readRaw(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

function writeRaw(value: StoredUser) {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // ignore persistence errors
  }
}

function migrateFromAnonymous(): StoredUser | null {
  try {
    const anonymous = localStorage.getItem(ANONYMOUS_USER_ID_KEY)
    if (anonymous && typeof anonymous === 'string' && anonymous.length > 0) {
      const user: User = { anonymous: { id: anonymous } }
      const stored: StoredUser = { user }
      writeRaw(stored)
      return stored
    }
  } catch {
    /* ignore */
  }
  return null
}

export function getStoredUser(): StoredUser {
  const existing = readRaw() || migrateFromAnonymous()
  if (existing) return existing
  // Create a new anonymous user id
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  const stored: StoredUser = { user: { anonymous: { id } } }
  writeRaw(stored)
  return stored
}

export function setStoredUser(value: StoredUser) {
  writeRaw(value)
}

export function setAuthenticatedUser(user: User, accessToken: string) {
  setStoredUser({ user, accessToken })
}

export function setAnonymousUserId(id: string) {
  setStoredUser({ user: { anonymous: { id } } })
}

export function getUserId(): string {
  const { user } = getStoredUser()
  if (isAnonymous(user)) return user.anonymous.id
  if (isAuthenticated(user)) return user.authenticated.id
  // Fallback shouldn't happen
  return ''
}

export function getAuthHeaders(): Record<string, string> {
  const stored = getStoredUser()
  if (stored.accessToken) {
    return { Authorization: `Bearer ${stored.accessToken}` }
  }
  const id = getUserId()
  return { 'x-user-uuid': id }
}

/**
 * Frontend-only logout: clear any stored access token and switch to an anonymous user.
 * Does not call the backend.
 */
export function logOut() {
  // Generate a fresh anonymous id
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  setAnonymousUserId(id)
}
