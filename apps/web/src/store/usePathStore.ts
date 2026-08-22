import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

export interface Milestone {
  id: string;
  title: string;
  explanation: string;
  status: 'locked' | 'active' | 'completed';
}

interface PathState {
  userGoal: string | null;
  nodes: Node[];
  edges: Edge[];
  activeMilestone: Milestone | null;
  setGraph: (nodes: Node[], edges: Edge[]) => void;
  setActiveMilestone: (milestone: Milestone) => void;
  setUserGoal: (goal: string) => void;
}

export const usePathStore = create<PathState>((set) => ({
  userGoal: null,
  nodes: [],
  edges: [],
  activeMilestone: null,
  setGraph: (nodes, edges) => set({ nodes, edges }),
  setActiveMilestone: (activeMilestone) => set({ activeMilestone }),
  setUserGoal: (userGoal) => set({ userGoal }),
}));
