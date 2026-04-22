const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';

async function extractError(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.error === 'string') return parsed.error;
    if (typeof parsed?.message === 'string') return parsed.message;
  } catch {
    // não é JSON — devolve o raw se for curto, senão mensagem genérica
  }
  if (raw && raw.length < 200) return raw;
  return `Erro ${res.status}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(await extractError(res));
  }
  return res.json();
}

async function requestNoBody(path: string, options?: RequestInit): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, { ...options });
  if (!res.ok) {
    throw new Error(await extractError(res));
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path: string) => requestNoBody(path, { method: 'DELETE' }),
};
