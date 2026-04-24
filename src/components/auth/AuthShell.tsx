'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import AutoRefreshTicker from '@/components/layout/AutoRefreshTicker';
import { AlertWebSocket } from '@/lib/websocket';
import { getToken, subscribeAuthChanged } from '@/lib/auth';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const sync = () => {
      setHasToken(Boolean(getToken()));
      setReady(true);
    };
    sync();
    const unsub = subscribeAuthChanged(sync);
    return unsub;
  }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    if (pathname === '/login') return;
    if (!hasToken) router.replace('/login');
  }, [hasToken, pathname, ready, router]);

  // Login page: no app chrome.
  if (pathname === '/login') return <>{children}</>;

  // While redirecting, show a small gate screen (avoids "blank page").
  if (!ready || !hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Redirecting to login…
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertWebSocket />
      <AutoRefreshTicker />
      <Sidebar />
      <div className="ml-56 min-h-screen flex flex-col transition-all duration-300">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </>
  );
}

