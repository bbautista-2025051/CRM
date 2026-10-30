import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  api,
  buildQuery,
  getCsrfToken,
  getFieldErrors,
  request,
  setCsrfToken,
} from './api';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('cliente HTTP', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    setCsrfToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setCsrfToken(null);
  });

  it('envía el token CSRF en mutaciones y credenciales de sesión', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { ok: true } }));
    setCsrfToken('csrf-123');

    await api.post('/api/things', { name: 'Acme' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(url).toBe('/api/things');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(headers.get('X-CSRF-Token')).toBe('csrf-123');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'Acme' }));
  });

  it('no envía CSRF en lecturas', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));
    setCsrfToken('csrf-123');

    await api.get('/api/things');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('X-CSRF-Token')).toBeNull();
  });

  it('no intenta serializar FormData', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
    const form = new FormData();
    form.append('avatar', new File(['x'], 'a.png', { type: 'image/png' }));

    await api.post('/api/settings/avatar', form);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBeNull();
    expect(init.body).toBe(form);
  });

  it('devuelve undefined en respuestas 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.delete('/api/things/1')).resolves.toBeUndefined();
  });

  it('convierte errores del API en ApiError con código y detalles', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos inválidos',
            details: { fields: [{ path: 'email', message: 'Correo inválido' }] },
          },
        },
        422,
      ),
    );

    const error = await request('/api/things').catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(422);
    expect(apiError.code).toBe('VALIDATION_ERROR');
    expect(apiError.message).toBe('Datos inválidos');
    expect(getFieldErrors(apiError.details)).toEqual({ email: 'Correo inválido' });
  });

  it('emite un evento de sesión expirada en 401', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Sesión expirada' } }, 401),
    );
    const listener = vi.fn();
    window.addEventListener('nexo:unauthorized', listener);

    await expect(api.get('/api/private')).rejects.toBeInstanceOf(ApiError);

    window.removeEventListener('nexo:unauthorized', listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('permite omitir el evento de sesión expirada', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Sin sesión' } }, 401),
    );
    const listener = vi.fn();
    window.addEventListener('nexo:unauthorized', listener);

    await expect(
      api.get('/api/auth/me', { skipAuthEvent: true }),
    ).rejects.toBeInstanceOf(ApiError);

    window.removeEventListener('nexo:unauthorized', listener);
    expect(listener).not.toHaveBeenCalled();
  });

  it('reporta errores de red con estado 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('failed to fetch'));

    const error = (await api.get('/api/things').catch((reason: unknown) => reason)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.code).toBe('NETWORK_ERROR');
  });
});

describe('utilidades del cliente', () => {
  it('buildQuery omite valores vacíos y codifica el resto', () => {
    const query = buildQuery({
      page: 2,
      search: 'ana lópez',
      status: '',
      ownerId: undefined,
      active: true,
    });
    expect(query).toBe('?page=2&search=ana+l%C3%B3pez&active=true');
  });

  it('buildQuery devuelve cadena vacía sin parámetros', () => {
    expect(buildQuery({ search: '', page: undefined })).toBe('');
  });

  it('getFieldErrors ignora detalles inválidos y conserva el primer mensaje', () => {
    expect(getFieldErrors(null)).toEqual({});
    expect(getFieldErrors({ fields: 'x' })).toEqual({});
    expect(
      getFieldErrors({
        fields: [
          { path: 'name', message: 'Primero' },
          { path: 'name', message: 'Segundo' },
          { path: 12, message: 'Inválido' },
        ],
      }),
    ).toEqual({ name: 'Primero' });
  });

  it('mantiene el token CSRF en memoria', () => {
    setCsrfToken('abc');
    expect(getCsrfToken()).toBe('abc');
    setCsrfToken(null);
    expect(getCsrfToken()).toBeNull();
  });
});
