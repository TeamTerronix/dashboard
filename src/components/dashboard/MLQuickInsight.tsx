'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getLatestReadings, getPredictions, mapLatestReadingRow } from '@/lib/api';
import { nearestAreaId } from '@/lib/geo';
import { useMonitoringAreas } from '@/lib/useMonitoringAreas';

export default function MLQuickInsight() {
  const { areas, loading: areasLoading } = useMonitoringAreas();
  const [loading, setLoading] = useState(true);
  const [zoneRisks, setZoneRisks] = useState<{ zone: string; risk: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [latest, preds] = await Promise.all([
          getLatestReadings(),
          getPredictions(0, 1000),
        ]);

        if (areasLoading || areas.length === 0) {
          if (!cancelled) {
            setZoneRisks([]);
            setLoading(false);
          }
          return;
        }

        // Map sensor_id -> area
        const sensorArea = new Map<number, string>();
        const anyLatest = latest as any;
        const latestRows = (Array.isArray(anyLatest?.value) ? anyLatest.value : anyLatest) as any[];
        for (const r of latestRows) {
          const row = mapLatestReadingRow(r as Record<string, unknown>);
          let areaId: string | null = row.networkGroupId ?? null;
          if (!areaId || !areas.some((a) => a.id === areaId)) {
            areaId = nearestAreaId(areas, row.latitude, row.longitude);
          }
          if (areaId) sensorArea.set(Number(r.sensor_id), areaId);
        }

        // Avg risk_score per area (first ~72h window by earliest timestamps)
        const byArea: Record<string, { sum: number; n: number }> = {};
        for (const a of areas) byArea[a.id] = { sum: 0, n: 0 };

        const anyPreds = preds as any;
        const predRows = (Array.isArray(anyPreds?.value) ? anyPreds.value : anyPreds) as any[];
        for (const p of predRows) {
          const sid = Number(p.sensor_id);
          const areaId = sensorArea.get(sid);
          if (!areaId) continue;
          const rs = p.risk_score;
          if (rs == null || Number.isNaN(Number(rs))) continue;
          if (!byArea[areaId]) continue;
          byArea[areaId].sum += Number(rs);
          byArea[areaId].n += 1;
        }

        const next = areas.map((a) => {
          const agg = byArea[a.id];
          const avg = agg.n ? agg.sum / agg.n : 0;
          return { zone: a.name, risk: Math.round(avg * 100) };
        });

        if (!cancelled) {
          setZoneRisks(next);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setZoneRisks(areas.map((a) => ({ zone: a.name, risk: 0 })));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [areas, areasLoading]);

  const headline = useMemo(() => {
    const top = [...zoneRisks].sort((a, b) => b.risk - a.risk)[0];
    if (!top) return 'No forecast data available yet.';
    return `${top.risk}% relative risk in ${top.zone} based on stored predictions.`;
  }, [zoneRisks]);

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        ML Quick Insight
      </h3>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-bold" style={{ color: 'var(--warn-amber)' }}>Forecast:</span>{' '}
        {loading ? 'Loading…' : headline}
      </p>

      <div className="space-y-2 mt-1">
        {zoneRisks.map((z) => (
          <div key={z.zone} className="flex items-center gap-2 text-xs">
            <span className="w-14 font-mono" style={{ color: 'var(--text-primary)' }}>
              {z.zone}
            </span>
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${z.risk}%`,
                  background:
                    z.risk > 60
                      ? 'var(--danger-coral)'
                      : z.risk > 30
                      ? 'var(--warn-amber)'
                      : 'var(--accent-teal)',
                }}
              />
            </div>
            <span className="font-mono w-10 text-right" style={{ color: 'var(--text-secondary)' }}>
              {z.risk}%
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/predictions"
        className="flex items-center gap-1 text-xs font-medium mt-2 hover:underline"
        style={{ color: 'var(--accent-cyan)' }}
      >
        View Full Forecast <ArrowUpRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
