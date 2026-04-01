'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboardStore } from '@/lib/store';
import {
  LayoutDashboard,
  Map,
  BarChart3,
  Brain,
  Bell,
  Cpu,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Waves,
  ShieldCheck,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map', label: 'Spatial Map', icon: Map },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/predictions', label: 'ML Predictions', icon: Brain },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/nodes', label: 'Node Management', icon: Cpu },
  { href: '/export', label: 'Data Export', icon: Download },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminItems = [
  { href: '/admin/health', label: 'Device Health', icon: ShieldCheck },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useDashboardStore();
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col border-r transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b" style={{ borderColor: 'var(--border)' }}>
        <Waves className="w-7 h-7 shrink-0" style={{ color: 'var(--accent-cyan)' }} />
        {!sidebarCollapsed && (
          <span className="font-bold text-lg tracking-wide" style={{ color: 'var(--accent-cyan)' }}>
            SLIOT
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'text-white' : 'hover:bg-[var(--bg-elevated)]'
              }`}
              style={{
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
              }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Admin section */}
        {!sidebarCollapsed && (
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            Admin
          </p>
        )}
        {sidebarCollapsed && <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />}
        {adminItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'text-white' : 'hover:bg-[var(--bg-elevated)]'
              }`}
              style={{
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
              }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-12 border-t cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
