'use client';

import { useEffect } from 'react';
import { useDashboardStore } from '@/lib/store';
import { dispatchDashboardDataRefresh } from '@/lib/data-refresh';

/**
 * Auto-refresh driver for pages that use subscribeDashboardDataRefresh().
 * This doesn't fetch itself; it just fires the event on an interval.
 */
export default function AutoRefreshTicker() {
  const refreshIntervalSec = useDashboardStore((s) => s.refreshIntervalSec);

  useEffect(() => {
    if (!Number.isFinite(refreshIntervalSec) || refreshIntervalSec <= 0) return;
    const id = window.setInterval(() => dispatchDashboardDataRefresh(), refreshIntervalSec * 1000);
    return () => window.clearInterval(id);
  }, [refreshIntervalSec]);

  return null;
}

