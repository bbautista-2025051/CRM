const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

const resolveApiUrl = (path: string): string =>
  API_BASE ? `${API_BASE}${path.startsWith('/') ? path : `/${path}`}` : path;

/**
 * Resuelve la ruta de un recurso servido por la API (por ejemplo un avatar)
 * cuando frontend y backend están publicados en dominios distintos.
 */
export const resolveAssetUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (/^(https?:)?\/\/|^data:|^blob:/i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
};

let csrfToken: string | null = null;

export const setCsrfToken = (token: string | null): void => {
  csrfToken = token;
};

export const getCsrfToken = (): string | null => csrfToken;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuthEvent?: boolean;
}

interface ErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

const isFormData = (value: unknown): value is FormData =>
  typeof FormData !== 'undefined' && value instanceof FormData;

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthEvent, headers: rawHeaders, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();
  const headers = new Headers(rawHeaders);

  if (body !== undefined && !isFormData(body)) {
    headers.set('Content-Type', 'application/json');
  }
  if (csrfToken && method !== 'GET' && method !== 'HEAD') {
    headers.set('X-CSRF-Token', csrfToken);
  }
  headers.set('Accept', 'application/json');

  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), {
      ...rest,
      method,
      headers,
      credentials: 'include',
      body:
        body === undefined
          ? undefined
          : isFormData(body)
            ? body
            : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorBody = payload as ErrorBody | null;
    const error = new ApiError(
      response.status,
      errorBody?.error?.code ?? 'UNKNOWN_ERROR',
      errorBody?.error?.message ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      errorBody?.error?.details,
    );

    if (response.status === 401 && !skipAuthEvent) {
      window.dispatchEvent(new CustomEvent('nexo:unauthorized'));
    }

    throw error;
  }

  return payload as T;
}

/**
 * Descarga un recurso binario autenticado usando la ruta de la API configurada.
 */
export async function download(path: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: '*/*' },
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (!response.ok) {
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        payload = null;
      }
    }
    const errorBody = payload as ErrorBody | null;
    const error = new ApiError(
      response.status,
      errorBody?.error?.code ?? 'UNKNOWN_ERROR',
      errorBody?.error?.message ?? 'No se pudo descargar el archivo.',
      errorBody?.error?.details,
    );
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('nexo:unauthorized'));
    }
    throw error;
  }

  return response.blob();
}

export const buildQuery = (
  params: Record<string, string | number | boolean | null | undefined>,
): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const getFieldErrors = (details: unknown): Record<string, string> => {
  if (!details || typeof details !== 'object') return {};
  const fields = (details as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return {};

  const result: Record<string, string> = {};
  for (const field of fields) {
    if (!field || typeof field !== 'object') continue;
    const path = (field as { path?: unknown }).path;
    const message = (field as { message?: unknown }).message;
    if (typeof path === 'string' && typeof message === 'string' && !result[path]) {
      result[path] = message;
    }
  }
  return result;
};

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
