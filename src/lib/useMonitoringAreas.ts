'use client';

import { useEffect, useState } from 'react';
import { getMe, getNetworkGroups } from '@/lib/api';
import { buildMonitoringAreasFromNetworkGroups } from '@/lib/network-areas';
import type { MonitoringArea } from '@/lib/types';

export function useMonitoringAreas() {
  const [areas, setAreas] = useState<MonitoringArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, groups] = await Promise.all([getMe(), getNetworkGroups()]);
        if (cancelled) return;
        setRole(me.role);
        setAreas(buildMonitoringAreasFromNetworkGroups(groups));
      } catch {
        if (!cancelled) {
          setAreas([]);
          setRole(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { areas, loading, role };
}
