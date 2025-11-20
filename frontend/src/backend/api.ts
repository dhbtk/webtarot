// Lightweight API client bindings for the backend routes defined in backend/src/main.rs
// Routes:
//  - POST /api/v1/reading → createReading
//  - GET  /api/v1/interpretation/{id} → getInterpretation
//  - GET  /api/v1/stats → getStats
//
// Models are defined in ./models.ts and mirror the Rust types.

import type {
  CreateReadingRequest,
  CreateReadingResponse,
  GetInterpretationResult,
  Stats,
} from './models';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

// Base path is proxied by Vite in development (see vite.config.ts), so relative `/api` works.
const API_BASE = '/api/v1';

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('Content-Type') || '';
  const isJson = contentType.includes('application/json');
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    if (isJson) {
      try {
        const body = await res.json();
        // Common patterns: { error: string } or any printable JSON
        if (typeof body?.error === 'string') message += `: ${body.error}`;
        else message += `: ${JSON.stringify(body)}`;
      } catch {
        // ignore JSON parse error
      }
    } else {
      try {
        message += `: ${await res.text()}`;
      } catch {
        /* ignore */
      }
    }
    throw new Error(message);
  }
  return isJson ? res.json() : (undefined as unknown as T);
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
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
    body: JSON.stringify(payload),
    ...init,
  });
  return handleJsonResponse<CreateReadingResponse>(res);
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
    headers: { ...(init?.headers ?? {}) },
    ...init,
  });
  return handleJsonResponse<GetInterpretationResult>(res);
}

/**
 * Fetch aggregate statistics about readings and cards.
 * GET /api/v1/stats
 */
export async function getStats(init?: RequestInit): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`, {
    method: 'GET',
    headers: { ...(init?.headers ?? {}) },
    ...init,
  });
  return handleJsonResponse<Stats>(res);
}
