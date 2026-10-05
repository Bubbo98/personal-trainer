import { API_BASE_URL } from '../config';

/**
 * The one HTTP client of the app. The backend answers
 * { success: true, data } or { success: false, error, code? }:
 * requests resolve to `data` and fail with an ApiError.
 */

export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable reason sent by the backend (e.g. PLAN_EXPIRED). */
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Session token storage keys: clients and the admin have separate sessions. */
export const CLIENT_TOKEN_KEY = 'dashboard_auth_token';
export const ADMIN_TOKEN_KEY = 'admin_auth_token';

export const tokenStore = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, token: string) => {
    try {
      localStorage.setItem(key, token);
    } catch {
      /* storage unavailable (private mode): the session lasts until reload */
    }
  },
  clear: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing to clear */
    }
  },
};

type Body = FormData | object | undefined;

export interface DownloadedFile {
  blob: Blob;
  fileName: string | null;
}

/** File name from a Content-Disposition header (RFC 5987 filename* first). */
export function fileNameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const extended = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (extended) {
    try {
      return decodeURIComponent(extended[1]);
    } catch {
      /* malformed: fall back to the plain name */
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : null;
}

async function errorFrom(response: Response): Promise<ApiError> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const body = await response.json();
    if (body?.error) message = body.error;
    code = body?.code;
  } catch {
    /* not JSON (proxy error page…) */
  }
  return new ApiError(message, response.status, code);
}

/** tokenKey: where the session token lives; null for unauthenticated calls. */
export function createApiClient(tokenKey: string | null) {
  const headers = (extra?: HeadersInit): Headers => {
    const h = new Headers(extra);
    const token = tokenKey ? tokenStore.get(tokenKey) : null;
    if (token) h.set('Authorization', `Bearer ${token}`);
    return h;
  };

  async function send(method: string, path: string, body?: Body, signal?: AbortSignal): Promise<Response> {
    const h = headers();
    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body; // the browser sets the multipart boundary
    } else if (body !== undefined) {
      h.set('Content-Type', 'application/json');
      payload = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, { method, headers: h, body: payload, signal });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      throw new ApiError('Network error', 0, 'NETWORK');
    }
    if (!response.ok) throw await errorFrom(response);
    return response;
  }

  async function request<T>(method: string, path: string, body?: Body, signal?: AbortSignal): Promise<T> {
    const response = await send(method, path, body, signal);
    if (response.status === 204) return undefined as T;
    const json = await response.json();
    return json.data as T;
  }

  return {
    get: <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal),
    post: <T = void>(path: string, body?: Body) => request<T>('POST', path, body),
    put: <T = void>(path: string, body?: Body) => request<T>('PUT', path, body),
    delete: <T = void>(path: string) => request<T>('DELETE', path),
    /** A file served by the API (PDF, report…) with the name the server gave it. */
    async download(path: string, signal?: AbortSignal): Promise<DownloadedFile> {
      const response = await send('GET', path, undefined, signal);
      return {
        blob: await response.blob(),
        fileName: fileNameFromDisposition(response.headers.get('Content-Disposition')),
      };
    },
    hasToken: () => tokenKey !== null && tokenStore.get(tokenKey) !== null,
    setToken: (token: string) => {
      if (tokenKey) tokenStore.set(tokenKey, token);
    },
    clearToken: () => {
      if (tokenKey) tokenStore.clear(tokenKey);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const clientApi = createApiClient(CLIENT_TOKEN_KEY);
export const adminApi = createApiClient(ADMIN_TOKEN_KEY);

/** Unauthenticated calls (public reviews…) */
export const publicApi = createApiClient(null);

/** Saves a blob as a file through a temporary link. */
export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking right away cancels the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
