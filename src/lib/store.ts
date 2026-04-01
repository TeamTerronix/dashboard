// Zustand store for global dashboard state

import { create } from 'zustand';

interface DashboardState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Date range
  dateRange: { from: string; to: string };
  setDateRange: (from: string, to: string) => void;

  // Available nodes (from backend)
  availableNodes: string[];
  setAvailableNodes: (nodeIds: string[]) => void;

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

  availableNodes: [],
  setAvailableNodes: (nodeIds) =>
    set((s) => ({
      availableNodes: nodeIds,
      // If nothing selected yet, auto-select all loaded nodes.
      selectedNodes: s.selectedNodes.length === 0 ? nodeIds : s.selectedNodes,
    })),

  selectedNodes: [],
  toggleNode: (nodeId) =>
    set((s) => ({
      selectedNodes: s.selectedNodes.includes(nodeId)
        ? s.selectedNodes.filter((id) => id !== nodeId)
        : [...s.selectedNodes, nodeId],
    })),
  selectAllNodes: () => set((s) => ({ selectedNodes: s.availableNodes })),
  deselectAllNodes: () => set({ selectedNodes: [] }),

  unit: 'celsius',
  toggleUnit: () =>
    set((s) => ({ unit: s.unit === 'celsius' ? 'fahrenheit' : 'celsius' })),

  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),
}));
