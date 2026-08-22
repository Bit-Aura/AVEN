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
  diagnosticComplete: boolean;
  isSimulatingSkip: boolean;
  simulatedConsequence: string | null;
  nodes: Node[];
  edges: Edge[];
  activeMilestone: Milestone | null;
  setGraph: (nodes: Node[], edges: Edge[]) => void;
  setActiveMilestone: (milestone: Milestone) => void;
  setUserGoal: (goal: string) => void;
  completeDiagnostic: () => void;
  simulateSkip: (nodeId: string) => void;
  cancelSimulation: () => void;
}

export const usePathStore = create<PathState>((set) => ({
  userGoal: null,
  diagnosticComplete: false,
  isSimulatingSkip: false,
  simulatedConsequence: null,
  nodes: [],
  edges: [],
  activeMilestone: null,
  setGraph: (nodes, edges) => set({ nodes, edges }),
  setActiveMilestone: (activeMilestone) => set({ activeMilestone }),
  setUserGoal: (userGoal) => set({ userGoal }),
  completeDiagnostic: () => set({ diagnosticComplete: true }),
  simulateSkip: (nodeId) => set({ 
    isSimulatingSkip: true, 
    simulatedConsequence: "Mock Consequence: Skipping this fundamental concept means you will likely fail the API Design module, which strictly requires it." 
  }),
  cancelSimulation: () => set({ isSimulatingSkip: false, simulatedConsequence: null }),
}));
