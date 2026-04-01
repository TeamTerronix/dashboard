const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const TOKEN_STORAGE_KEY = 'sliot_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function loginWithPassword(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'password',
    username: email,
    password,
  });

  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    let detail = `Login failed (${res.status})`;
    try {
      const json = await res.json();
      if (json?.detail) detail = String(json.detail);
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  const json = await res.json();
  const token = json?.access_token as string | undefined;
  if (!token) throw new Error('No access_token returned');
  return token;
}

