'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithPassword, setToken, clearToken, getToken, subscribeAuthChanged } from '@/lib/auth';

const devDefaults =
  process.env.NODE_ENV === 'development'
    ? { email: 'bar-reef@sliot.local', password: 'user123' }
    : { email: '', password: '' };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(devDefaults.email);
  const [password, setPassword] = useState(devDefaults.password);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    const sync = () => setHasToken(Boolean(getToken()));
    sync();
    return subscribeAuthChanged(sync);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await loginWithPassword(email.trim(), password);
      setToken(token);
      router.push('/');
    } catch (err: any) {
      setError(err?.message ? String(err.message) : 'Login failed');
      clearToken();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div
        className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Sign in
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Logs into the FastAPI backend and stores the JWT in <span className="font-mono">localStorage</span> as{' '}
          <span className="font-mono">sliot_token</span>.
        </p>

        {hasToken && (
          <div className="mt-4 rounded-lg border p-3 text-xs" style={{ borderColor: 'var(--border)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              A token already exists in this browser. You can log in again to replace it.
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg outline-none border text-sm"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              autoComplete="username"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full px-3 py-2 rounded-lg outline-none border text-sm"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-lg border p-3 text-xs" style={{ borderColor: 'rgba(255,82,82,0.5)' }}>
              <p style={{ color: 'var(--danger-coral)' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => {
              clearToken();
              router.refresh();
            }}
            className="w-full px-3 py-2 rounded-lg text-xs cursor-pointer"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            Clear token (logout)
          </button>
        </form>
      </div>
    </div>
  );
}

