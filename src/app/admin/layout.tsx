'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.role !== 'admin') {
          router.replace('/');
          return;
        }
        setAllowed(true);
      } catch {
        router.replace('/');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div
        className="flex items-center justify-center min-h-[40vh] rounded-xl border text-sm"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        Verifying admin access…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
