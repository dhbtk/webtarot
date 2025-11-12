// Lightweight API client bindings for the backend routes defined in backend/src/main.rs
// Routes:
//  - POST /api/v1/reading → createReading
//  - GET  /api/v1/interpretation/{id} → getInterpretation
//
// Models are defined in ./models.ts and mirror the Rust types.

import type {
  CreateReadingRequest,
  CreateReadingResponse,
  GetInterpretationResult,
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
 * Convenience helper to poll an interpretation until it's done or a timeout occurs.
 */
export async function pollInterpretation(
  interpretationId: string,
  options?: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal },
): Promise<GetInterpretationResult> {
  const interval = options?.intervalMs ?? 1000;
  const timeout = options?.timeoutMs ?? 60_000;
  const start = Date.now();

  // If the caller passed an AbortSignal, honor it.
  const signal = options?.signal;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const result = await getInterpretation(interpretationId, { signal });
    if (result.done) return result;

    if (Date.now() - start >= timeout) {
      const err = new Error('Polling interpretation timed out');
      (err as any).lastResult = result;
      throw err;
    }
    await new Promise((r, j) => {
      const id = setTimeout(r, interval);
      if (signal) {
        const onAbort = () => {
          clearTimeout(id);
          signal.removeEventListener('abort', onAbort);
          j(new DOMException('Aborted', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }
}
