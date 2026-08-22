import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

export interface Milestone {
  id: string;
  title: string;
  explanation: string;
  status: 'locked' | 'active' | 'completed';
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  isOnline: boolean;
  avatarUrl?: string;
}

interface PathState {
  userGoal: string | null;
  diagnosticComplete: boolean;
  isSimulatingSkip: boolean;
  simulatedConsequence: string | null;
  isTakingAssessment: boolean;
  isTrustPanelOpen: boolean;
  activeIdeNodeId: string | null;
  activeCoachNodeId: string | null;
  isOffline: boolean;
  streak: number;
  xp: number;
  syncQueue: string[];
  collaborators: Collaborator[];
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
  completeMilestoneViaIde: (nodeId: string) => void;
  toggleTrustPanel: () => void;
  openIde: (nodeId: string) => void;
  closeIde: () => void;
  openCoach: (nodeId: string) => void;
  closeCoach: () => void;
  toggleOffline: () => void;
  syncOfflineProgress: () => void;
  awardXp: (amount: number) => void;
}

export const usePathStore = create<PathState>((set) => ({
  userGoal: null,
  diagnosticComplete: false,
  isSimulatingSkip: false,
  simulatedConsequence: null,
  isTakingAssessment: false,
  isTrustPanelOpen: false,
  activeIdeNodeId: null,
  activeCoachNodeId: null,
  isOffline: false,
  streak: 5,
  xp: 1250,
  syncQueue: [],
  collaborators: [
    { id: 'u1', name: 'You', color: 'bg-blue-500', isOnline: true },
    { id: 'u2', name: 'Sriram (Mentor)', color: 'bg-emerald-500', isOnline: true },
    { id: 'u3', name: 'Alex (Peer)', color: 'bg-purple-500', isOnline: false }
  ],
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
      const newQueue = state.isOffline ? [...state.syncQueue, nodeId] : state.syncQueue;
      return { 
        activeMilestone: { ...state.activeMilestone, status: 'completed' },
        isTakingAssessment: false,
        syncQueue: newQueue,
        xp: state.xp + 150
      };
    }
    return { isTakingAssessment: false };
  }),
  completeMilestoneViaIde: (nodeId) => set((state) => {
    if (state.activeMilestone?.id === nodeId) {
      const newQueue = state.isOffline ? [...state.syncQueue, nodeId] : state.syncQueue;
      return { 
        activeMilestone: { ...state.activeMilestone, status: 'completed' },
        activeIdeNodeId: null,
        syncQueue: newQueue,
        xp: state.xp + 150
      };
    }
    return { activeIdeNodeId: null };
  }),
  toggleTrustPanel: () => set((state) => ({ isTrustPanelOpen: !state.isTrustPanelOpen })),
  openIde: (nodeId) => set({ activeIdeNodeId: nodeId }),
  closeIde: () => set({ activeIdeNodeId: null }),
  openCoach: (nodeId) => set({ activeCoachNodeId: nodeId }),
  closeCoach: () => set({ activeCoachNodeId: null }),
  toggleOffline: () => set((state) => ({ isOffline: !state.isOffline })),
  syncOfflineProgress: () => set({ syncQueue: [] }),
  awardXp: (amount) => set((state) => ({ xp: state.xp + amount })),
}));
