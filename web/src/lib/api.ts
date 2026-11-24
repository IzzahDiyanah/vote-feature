const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Thrown for any failed API call */
export class ApiError extends Error {
  constructor(
    public readonly status: number, // 0 = could not reach the server
    public readonly code: string,
    message: string,
    public readonly details?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** All API calls go through here. credentials: 'include' sends the cookie. */
export async function api<T>(path: string, { method = 'GET', body }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = data?.error;
    throw new ApiError(res.status, error?.code ?? 'UNKNOWN', error?.message ?? 'Something went wrong.', error?.details);
  }
  return data as T;
}

/** Turn any error into a message we can show */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.details?.length ? error.details.join(' ') : error.message;
  }
  return 'Something went wrong. Try again.';
}
