'use client';

import { zoneRisks } from '@/lib/mock-data';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function MLQuickInsight() {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        ML Quick Insight
      </h3>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-bold" style={{ color: 'var(--warn-amber)' }}>72h forecast:</span>{' '}
        68% probability of Zone-A exceeding 29°C based on PINN model output.
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
