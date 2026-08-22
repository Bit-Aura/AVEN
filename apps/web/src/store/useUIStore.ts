import { create } from 'zustand';

interface UIState {
  selectedNodeId: string | null;
  sidebarOpen: boolean;
  activeGoalId: number | null;
  setSelectedNodeId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveGoalId: (id: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedNodeId: null,
  sidebarOpen: false,
  activeGoalId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveGoalId: (id) => set({ activeGoalId: id }),
}));
