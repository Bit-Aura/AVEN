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
  isTakingAssessment: boolean;
  isTrustPanelOpen: boolean;
  nodes: Node[];
  edges: Edge[];
  activeMilestone: Milestone | null;
  setGraph: (nodes: Node[], edges: Edge[]) => void;
  setActiveMilestone: (milestone: Milestone) => void;
  setUserGoal: (goal: string) => void;
  completeDiagnostic: () => void;
  simulateSkip: (nodeId: string) => void;
  cancelSimulation: () => void;
  startAssessment: () => void;
  stopAssessment: () => void;
  bypassMilestone: (nodeId: string) => void;
  toggleTrustPanel: () => void;
}

export const usePathStore = create<PathState>((set) => ({
  userGoal: null,
  diagnosticComplete: false,
  isSimulatingSkip: false,
  simulatedConsequence: null,
  isTakingAssessment: false,
  isTrustPanelOpen: false,
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
  startAssessment: () => set({ isTakingAssessment: true }),
  stopAssessment: () => set({ isTakingAssessment: false }),
  bypassMilestone: (nodeId) => set((state) => {
    // In a real app, this would update the graph edge states. 
    // For MVP frontend UI, we just mark the milestone as completed.
    if (state.activeMilestone?.id === nodeId) {
      return { 
        activeMilestone: { ...state.activeMilestone, status: 'completed' },
        isTakingAssessment: false 
      };
    }
    return { isTakingAssessment: false };
  }),
  toggleTrustPanel: () => set((state) => ({ isTrustPanelOpen: !state.isTrustPanelOpen })),
}));
