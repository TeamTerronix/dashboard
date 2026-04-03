'use client';

import { tempToColor } from '@/lib/utils';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Expand } from 'lucide-react';
import { getLatestReadings } from '@/lib/api';
import { subscribeDashboardDataRefresh } from '@/lib/data-refresh';

export default function MiniHeatmap() {
  const [points, setPoints] = useState<{ lat: number; lon: number; temp: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const latest = await getLatestReadings();
        const anyLatest = latest as any;
        const rows = (Array.isArray(anyLatest?.value) ? anyLatest.value : anyLatest) as any[];
        const mapped = rows
          .filter((r) => r.latitude != null && r.longitude != null)
          .map((r) => ({ lat: Number(r.latitude), lon: Number(r.longitude), temp: Number(r.temperature) }));
        if (!cancelled) setPoints(mapped);
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setMounted(true);
      }
    };
    load();
    const unsub = subscribeDashboardDataRefresh(load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  // Canvas dimensions
  const W = 280;
  const H = 200;

  // Bounds around Sri Lanka reef sites (broad; mini preview only)
  const latMin = 5.8, latMax = 9.1;
  const lonMin = 79.4, lonMax = 81.4;

  const toX = (lon: number) => ((lon - lonMin) / (lonMax - lonMin)) * W;
  const toY = (lat: number) => H - ((lat - latMin) / (latMax - latMin)) * H;

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Spatial Heatmap
        </h3>
        <Link href="/map" className="hover:opacity-80" style={{ color: 'var(--accent-cyan)' }}>
          <Expand className="w-4 h-4" />
        </Link>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg" style={{ background: 'var(--bg-primary)' }}>
        {/* Latest readings */}
        {mounted && points.map((p, i) => (
          <g key={i}>
            <circle cx={toX(p.lon)} cy={toY(p.lat)} r={6} fill={tempToColor(p.temp)} opacity={0.85} />
            <circle cx={toX(p.lon)} cy={toY(p.lat)} r={2.5} fill="white" opacity={0.9} />
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-secondary)' }}>
        <span>25°C</span>
        <div
          className="flex-1 mx-2 h-2 rounded"
          style={{
            background: 'linear-gradient(90deg, #00A0FF, #1DE9B6, #FFB300, #FF5252)',
          }}
        />
        <span>31°C</span>
      </div>
    </div>
  );
}
