'use client';

import { Info } from 'lucide-react';

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div
        className="flex items-start gap-3 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <Info className="w-5 h-5 shrink-0" style={{ color: 'var(--accent-cyan)' }} />
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Alerts
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            This dashboard receives alerts in real time over WebSocket after you log in and store the token in
            `localStorage` as `sliot_token`. Historical alert storage isn’t implemented in the backend yet.
          </p>
        </div>
      </div>
    </div>
  );
}
