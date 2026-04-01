// Zustand store for global dashboard state

import { create } from 'zustand';
import { sensorNodes } from './mock-data';

const allNodeIds = sensorNodes.map((n) => n.id);

interface DashboardState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Date range
  dateRange: { from: string; to: string };
  setDateRange: (from: string, to: string) => void;

  // Selected nodes
  selectedNodes: string[];
  toggleNode: (nodeId: string) => void;
  selectAllNodes: () => void;
  deselectAllNodes: () => void;

  // Unit
  unit: 'celsius' | 'fahrenheit';
  toggleUnit: () => void;

  // Active page
  activePage: string;
  setActivePage: (page: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  dateRange: { from: '2026-01-26', to: '2026-02-25' },
  setDateRange: (from, to) => set({ dateRange: { from, to } }),

  selectedNodes: allNodeIds,
  toggleNode: (nodeId) =>
    set((s) => ({
      selectedNodes: s.selectedNodes.includes(nodeId)
        ? s.selectedNodes.filter((id) => id !== nodeId)
        : [...s.selectedNodes, nodeId],
    })),
  selectAllNodes: () => set({ selectedNodes: allNodeIds }),
  deselectAllNodes: () => set({ selectedNodes: [] }),

  unit: 'celsius',
  toggleUnit: () =>
    set((s) => ({ unit: s.unit === 'celsius' ? 'fahrenheit' : 'celsius' })),

  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),
}));
