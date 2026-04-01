'use client';

import { useState } from 'react';
import { useDashboardStore } from '@/lib/store';
import { Save, RotateCcw } from 'lucide-react';

export default function SettingsPage() {
  const { unit, toggleUnit } = useDashboardStore();
  const [thresholdWarning, setThresholdWarning] = useState(28.0);
  const [thresholdCritical, setThresholdCritical] = useState(29.0);
  const [refreshInterval, setRefreshInterval] = useState(300);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h2>

      {/* Display Settings */}
      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Display</h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Temperature Unit</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Toggle between Celsius and Fahrenheit</div>
          </div>
          <button
            onClick={toggleUnit}
            className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer"
            style={{ background: 'var(--bg-elevated)', color: 'var(--accent-cyan)' }}
          >
            {unit === 'celsius' ? '°C → °F' : '°F → °C'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Auto-refresh Interval</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>How often to poll for new data</div>
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-xs border-none outline-none cursor-pointer"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={900}>15 minutes</option>
            <option value={3600}>1 hour</option>
          </select>
        </div>
      </div>

      {/* Threshold Settings */}
      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Temperature Thresholds</h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ color: 'var(--warn-amber)' }}>Warning Threshold</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Triggers yellow alerts on charts</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={0.1}
              value={thresholdWarning}
              onChange={(e) => setThresholdWarning(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 rounded text-sm font-mono text-right border-none outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--warn-amber)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>°C</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ color: 'var(--danger-coral)' }}>Critical Threshold</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Triggers red alerts and notifications</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={0.1}
              value={thresholdCritical}
              onChange={(e) => setThresholdCritical(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 rounded text-sm font-mono text-right border-none outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--danger-coral)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>°C</span>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Email Notifications</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Receive alerts via email</div>
          </div>
          <div
            onClick={() => setEmailNotifications(!emailNotifications)}
            className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
            style={{ background: emailNotifications ? 'var(--accent-cyan)' : 'var(--bg-elevated)' }}
          >
            <div
              className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
              style={{ left: emailNotifications ? '22px' : '2px' }}
            />
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>SMS Notifications</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Critical alerts only</div>
          </div>
          <div
            onClick={() => setSmsNotifications(!smsNotifications)}
            className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
            style={{ background: smsNotifications ? 'var(--accent-cyan)' : 'var(--bg-elevated)' }}
          >
            <div
              className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
              style={{ left: smsNotifications ? '22px' : '2px' }}
            />
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
        >
          <Save className="w-4 h-4" />
          Save Settings
        </button>
        <button
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-opacity hover:opacity-90 border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
