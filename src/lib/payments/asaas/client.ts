const ASAAS_ENV = process.env.ASAAS_ENV ?? 'sandbox';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

const BASE_URL =
  ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

export class AsaasError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Asaas API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

export async function asaasRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!ASAAS_API_KEY) {
    throw new AsaasError(0, { message: 'ASAAS_API_KEY ausente' });
  }

  const url = new URL(`${BASE_URL}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'VendingPro/1.0',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const json = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    throw new AsaasError(res.status, json ?? text);
  }
  return json as T;
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export function isAsaasConfigured(): boolean {
  return !!ASAAS_API_KEY;
}
