// Lightweight API client bindings for the backend routes defined in backend/src/main.rs
// Routes:
//  - POST /api/v1/reading → createReading
//  - GET  /api/v1/interpretation/{id} → getInterpretation
//  - GET  /api/v1/stats → getStats
//  - DELETE /api/v1/interpretation/{id} → deleteInterpretation
//
// Models are defined in ./models.ts and mirror the Rust types.

import type {
  CreateReadingRequest,
  CreateReadingResponse,
  GetInterpretationResult,
  Stats,
  Interpretation,
  CreateInterpretationRequest,
  CreateInterpretationResponse,
  CreateUserRequest,
  CreateUserResponse,
  LogInRequest,
  UpdateUserRequest,
  User,
} from './models'
import { getAuthHeaders } from './user.ts'
import i18n from '../i18n.ts'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

// Base path is proxied by Vite in development (see vite.config.ts), so relative `/api` works.
const API_BASE = '/api/v1'

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('Content-Type') || ''
  const isJson = contentType.includes('application/json')
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    if (isJson) {
      try {
        const body = await res.json()
        // Common patterns: { error: string } or any printable JSON
        if (typeof body?.error === 'string') message += `: ${body.error}`
        else message += `: ${JSON.stringify(body)}`
      } catch {
        // ignore JSON parse error
      }
    } else {
      try {
        message += `: ${await res.text()}`
      } catch {
        /* ignore */
      }
    }
    throw new Error(message)
  }
  return isJson ? res.json() : (undefined as unknown as T)
}

function getCurrentLocale(): string {
  // Prefer resolvedLanguage, then language, falling back to configured fallbackLng
  const raw =
    i18n.resolvedLanguage ||
    i18n.language ||
    (Array.isArray(i18n.options.fallbackLng)
      ? i18n.options.fallbackLng[0]
      : typeof i18n.options.fallbackLng === 'string'
        ? i18n.options.fallbackLng
        : 'en') ||
    'en'
  // Normalize to just the language part expected by the backend (e.g., en, pt)
  return raw.split(/[-_]/)[0]?.toLowerCase() || 'en'
}

function getDefaultHeaders() {
  return {
    ...getAuthHeaders(),
    'x-locale': getCurrentLocale(),
  }
}

/**
 * Create a new tarot reading.
 * POST /api/v1/reading
 */
export async function createReading(
  payload: CreateReadingRequest,
  init?: RequestInit,
): Promise<CreateReadingResponse> {
  const res = await fetch(`${API_BASE}/reading`, {
    method: 'POST',
    headers: { ...getDefaultHeaders(), ...JSON_HEADERS, ...(init?.headers ?? {}) },
    body: JSON.stringify(payload),
    ...init,
  })
  return handleJsonResponse<CreateReadingResponse>(res)
}

/**
 * Fetch the interpretation for a reading by ID.
 * GET /api/v1/interpretation/{id}
 */
export async function getInterpretation(
  interpretationId: string,
  init?: RequestInit,
): Promise<GetInterpretationResult> {
  const res = await fetch(`${API_BASE}/interpretation/${encodeURIComponent(interpretationId)}`, {
    method: 'GET',
    headers: { ...getDefaultHeaders(), ...(init?.headers ?? {}) },
    ...init,
  })
  return handleJsonResponse<GetInterpretationResult>(res)
}

/**
 * Fetch aggregate statistics about readings and cards.
 * GET /api/v1/stats
 */
export async function getStats(init?: RequestInit): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`, {
    method: 'GET',
    headers: { ...getDefaultHeaders(), ...(init?.headers ?? {}) },
    ...init,
  })
  return handleJsonResponse<Stats>(res)
}

/**
 * Fetch interpretation history for the current user.
 * Cursor pagination: pass `before` (ISO timestamp) to get items with createdAt < before.
 * Optional `limit` controls page size.
 * GET /api/v1/interpretation/history?before=...&limit=...
 */
export async function getHistory(
  params?: { before?: string; limit?: number },
  init?: RequestInit,
): Promise<Interpretation[]> {
  const qs = new URLSearchParams()
  if (params?.before) qs.set('before', params.before)
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit))
  const url = `${API_BASE}/interpretation/history${qs.toString() ? `?${qs.toString()}` : ''}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { ...getDefaultHeaders(), ...(init?.headers ?? {}) },
    ...init,
  })
  return handleJsonResponse<Interpretation[]>(res)
}

/**
 * Create a new interpretation from a manually provided question and cards.
 * POST /api/v1/interpretation
 */
export async function createInterpretation(
  payload: CreateInterpretationRequest,
  init?: RequestInit,
): Promise<CreateInterpretationResponse> {
  const res = await fetch(`${API_BASE}/interpretation`, {
    method: 'POST',
    headers: { ...getDefaultHeaders(), ...JSON_HEADERS, ...(init?.headers ?? {}) },
    body: JSON.stringify(payload),
    ...init,
  })
  return handleJsonResponse<CreateInterpretationResponse>(res)
}

/**
 * Delete an interpretation by ID.
 * DELETE /api/v1/interpretation/{id}
 */
export async function deleteInterpretation(
  interpretationId: string,
  init?: RequestInit,
): Promise<void> {
  const res = await fetch(`${API_BASE}/interpretation/${encodeURIComponent(interpretationId)}`, {
    method: 'DELETE',
    headers: { ...getDefaultHeaders(), ...(init?.headers ?? {}) },
    ...init,
  })
  // For 204 No Content, handleJsonResponse returns undefined
  await handleJsonResponse<void>(res)
}

/**
 * Create user (sign up)
 * POST /api/v1/user
 */
export async function createUser(
  payload: CreateUserRequest,
  init?: RequestInit,
): Promise<CreateUserResponse> {
  const res = await fetch(`${API_BASE}/user`, {
    method: 'POST',
    headers: { ...getDefaultHeaders(), ...JSON_HEADERS, ...(init?.headers ?? {}) },
    body: JSON.stringify(payload),
    ...init,
  })
  return handleJsonResponse<CreateUserResponse>(res)
}

/**
 * Log in
 * POST /api/v1/login
 */
export async function logIn(
  payload: LogInRequest,
  init?: RequestInit,
): Promise<CreateUserResponse> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { ...getDefaultHeaders(), ...JSON_HEADERS, ...(init?.headers ?? {}) },
    body: JSON.stringify(payload),
    ...init,
  })
  return handleJsonResponse<CreateUserResponse>(res)
}

/**
 * Get current user
 * GET /api/v1/user
 */
export async function getUser(init?: RequestInit): Promise<User> {
  const res = await fetch(`${API_BASE}/user`, {
    method: 'GET',
    headers: { ...getDefaultHeaders(), ...(init?.headers ?? {}) },
    ...init,
  })
  return handleJsonResponse<User>(res)
}

/**
 * Update current user
 * PATCH /api/v1/user
 */
export async function updateUser(payload: UpdateUserRequest, init?: RequestInit): Promise<User> {
  const res = await fetch(`${API_BASE}/user`, {
    method: 'PATCH',
    headers: { ...getDefaultHeaders(), ...JSON_HEADERS, ...(init?.headers ?? {}) },
    body: JSON.stringify(payload),
    ...init,
  })
  return handleJsonResponse<User>(res)
}
