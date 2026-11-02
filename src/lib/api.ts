import { getApiUrl } from '@/lib/config';
import { clearAccessToken, getAccessToken } from '@/lib/session';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ApiEnvelope<T> = {
  data: T;
  message: string;
  meta?: PaginationMeta;
};

type QueryValue = string | number | boolean | undefined | null;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  query?: Record<string, QueryValue>;
};

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = `${getApiUrl()}${path}`;
  if (!query) {
    return url;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params.set(key, String(value));
  }

  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function errorMessageFromBody(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return 'Request failed';
  }

  const message = (body as { message: unknown }).message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (Array.isArray(message) && message.length > 0 && typeof message[0] === 'string') {
    return message[0];
  }

  return 'Request failed';
}

export function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const useAuth = options.auth !== false;
  if (useAuth) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(`Can't reach the store at ${getApiUrl()}.`, 0);
  }

  let parsed: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    parsed = await response.json();
  }

  if (response.status === 401 && useAuth) {
    await clearAccessToken();
    onUnauthorized?.();
  }

  if (!response.ok) {
    throw new ApiError(errorMessageFromBody(parsed), response.status);
  }

  return parsed as ApiEnvelope<T>;
}
