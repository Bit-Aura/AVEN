import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

export interface DiagnosticQuestion {
  question_id: string;
  question_text: string;
  options: string[];
  target_skill: string;
}

interface Milestone {
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

export interface ProofCardData {
  skillName: string;
  confidenceScore: number;
  evidenceTags: string[];
  narrative: string;
  issueDate: string;
}

export interface RankingPreferences {
  speedVsDepth: number;
  freeVsPaid: number;
  videoVsProject: number;
}

interface PathState {
  profileId: number | null;
  sessionId: number | null;
  userGoal: string | null;
  diagnosticComplete: boolean;
  nextQuestion: DiagnosticQuestion | null;
  isLoading: boolean;
  isSimulatingSkip: boolean;
  simulatedConsequence: string | null;
  isTakingAssessment: boolean;
  isTrustPanelOpen: boolean;
  activeIdeNodeId: string | null;
  activeCoachNodeId: string | null;
  isOffline: boolean;
  streak: number;
  xp: number;
  showCelebration: boolean;
  showUndoToast: boolean;
  isCommandPaletteOpen: boolean;
  isFocusMode: boolean;
  activeProofCard: ProofCardData | null;
  rankingPreferences: RankingPreferences;
  previousStateSnapshot: Partial<PathState> | null;
  syncQueue: string[];
  collaborators: Collaborator[];
  
  // New State for Coach & Checkpoint
  coachMessages: { role: 'user' | 'ai', text: string }[];
  isCoachTyping: boolean;
  currentAssessment: { question: string; options: string[] } | null;
  isFetchingAssessment: boolean;
  
  nodes: Node[];
  edges: Node[];
  activeMilestone: Milestone | null;
  setGraph: (nodes: Node[], edges: Edge[]) => void;
  setActiveMilestone: (milestone: Milestone) => void;
  setUserGoal: (goal: string) => Promise<void>;
  completeDiagnostic: (questionId: string, answer: string) => Promise<void>;
  simulateSkip: (nodeId: string) => Promise<void>;
  cancelSimulation: () => void;
  startAssessment: () => void;
  stopAssessment: () => void;
  fetchAssessment: (nodeId: string) => Promise<void>;
  sendCoachMessage: (nodeId: string, message: string) => Promise<void>;
  bypassMilestone: (nodeId: string, answer: string) => Promise<void>;
  completeMilestoneViaIde: (nodeId: string) => void;
  toggleTrustPanel: () => void;
  openIde: (nodeId: string) => void;
  closeIde: () => void;
  openCoach: (nodeId: string) => void;
  closeCoach: () => void;
  toggleOffline: () => void;
  syncOfflineProgress: () => void;
  awardXp: (amount: number) => void;
  hideCelebration: () => void;
  undoLastAction: () => void;
  hideUndoToast: () => void;
  toggleCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleFocusMode: () => void;
  openProofCard: (card: ProofCardData) => void;
  closeProofCard: () => void;
  updateRankingPreference: (key: keyof RankingPreferences, value: number) => void;
}

export const usePathStore = create<PathState>((set, get) => ({
  profileId: null,
  sessionId: null,
  userGoal: null,
  diagnosticComplete: false,
  nextQuestion: null,
  isLoading: false,
  isSimulatingSkip: false,
  simulatedConsequence: null,
  isTakingAssessment: false,
  isTrustPanelOpen: false,
  activeIdeNodeId: null,
  activeCoachNodeId: null,
  isOffline: false,
  streak: 5,
  xp: 1250,
  showCelebration: false,
  showUndoToast: false,
  isCommandPaletteOpen: false,
  isFocusMode: false,
  activeProofCard: null,
  rankingPreferences: {
    speedVsDepth: 50,
    freeVsPaid: 50,
    videoVsProject: 50,
  },
  previousStateSnapshot: null,
  syncQueue: [],
  collaborators: [
    { id: 'u1', name: 'You', color: 'bg-blue-500', isOnline: true },
    { id: 'u2', name: 'Sriram (Mentor)', color: 'bg-emerald-500', isOnline: true },
    { id: 'u3', name: 'Alex (Peer)', color: 'bg-purple-500', isOnline: false }
  ],
  coachMessages: [{ role: 'ai', text: "Hi! I'm your AI Coach. How can I help you with this milestone?" }],
  isCoachTyping: false,
  currentAssessment: null,
  isFetchingAssessment: false,
  nodes: [],
  edges: [],
  activeMilestone: null,
  setGraph: (nodes, edges) => set({ nodes, edges }),
  setActiveMilestone: (activeMilestone) => set({ activeMilestone }),
  setUserGoal: async (userGoal) => {
    set({ isLoading: true });
    try {
      // @ts-ignore
      const { submitGoal } = await import('../api/client');
      const res = await submitGoal('demo@pathfinder.dev', userGoal);
      set({ 
        userGoal, 
        profileId: res.profile_id, 
        sessionId: res.session_id,
        nextQuestion: res.next_question
      });
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },
  completeDiagnostic: async (questionId, answer) => {
    const { sessionId } = get();
    if (sessionId) {
      set({ isLoading: true });
      try {
        // @ts-ignore
        const { submitDiagnostic } = await import('../api/client');
        const res = await submitDiagnostic(sessionId, questionId, answer);
        if (res.status === 'completed') {
          // Compute active milestone from path
          const path = res.path || [];
          const activeNodeId = path.length > 0 ? path[0].id : null;
          
          let activeMilestone = null;
          if (activeNodeId) {
            const activeNode = path.find((n: any) => n.id === activeNodeId);
            activeMilestone = {
              id: activeNode.id,
              title: activeNode.name || activeNode.id,
              explanation: activeNode.learning_objectives?.join(', ') || 'Based on your diagnostic, this is the most critical starting point.',
              status: 'active' as const
            };
          }
          
          // Map backend nodes/edges to ReactFlow format
          const nodes = path.map((n: any, idx: number) => ({
            id: n.id,
            position: { x: 0, y: idx * 100 },
            data: { label: n.name || n.id },
            type: idx === 0 ? 'input' : 'default'
          }));
          
          const edges: Edge[] = [];
          for (let i = 0; i < path.length - 1; i++) {
            edges.push({
              id: `e-${path[i].id}-${path[i+1].id}`,
              source: path[i].id,
              target: path[i+1].id
            });
          }

          set({ 
            diagnosticComplete: true, 
            nextQuestion: null,
            nodes,
            edges,
            activeMilestone
          });
        } else {
          set({ nextQuestion: res.next_question });
        }
      } catch (e) {
        console.error(e);
      } finally {
        set({ isLoading: false });
      }
    } else {
      set({ diagnosticComplete: true });
    }
  },
  simulateSkip: async (nodeId) => {
    const { profileId } = get();
    if (profileId) {
      try {
        // @ts-ignore
        const { simulateSkip } = await import('../api/client');
        const res = await simulateSkip(profileId, nodeId);
        set({
          isSimulatingSkip: true,
          simulatedConsequence: res.downstream_impact?.[0]?.impact_reason || "Mock Consequence: Skipping this fundamental concept means you will likely fail the API Design module, which strictly requires it."
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      set({ 
        isSimulatingSkip: true, 
        simulatedConsequence: "Mock Consequence: Skipping this fundamental concept means you will likely fail the API Design module, which strictly requires it." 
      });
    }
  },
  cancelSimulation: () => set({ isSimulatingSkip: false, simulatedConsequence: null }),
  startAssessment: () => set({ isTakingAssessment: true }),
  stopAssessment: () => set({ isTakingAssessment: false }),
  fetchAssessment: async (nodeId) => {
    set({ isFetchingAssessment: true, currentAssessment: null });
    try {
      // @ts-ignore
      const { getCheckpointQuestion } = await import('../api/client');
      const res = await getCheckpointQuestion(nodeId);
      set({ currentAssessment: res });
    } catch (e) {
      console.error(e);
      // Fallback
      set({ currentAssessment: { question: "Failed to load assessment.", options: ["Cancel"] } });
    } finally {
      set({ isFetchingAssessment: false });
    }
  },
  sendCoachMessage: async (nodeId, message) => {
    set((state) => ({ 
      coachMessages: [...state.coachMessages, { role: 'user', text: message }],
      isCoachTyping: true 
    }));
    try {
      // @ts-ignore
      const { sendCoachMessage } = await import('../api/client');
      const res = await sendCoachMessage(nodeId, message);
      set((state) => ({ 
        coachMessages: [...state.coachMessages, { role: 'ai', text: res.reply }]
      }));
    } catch (e) {
      console.error(e);
      set((state) => ({ 
        coachMessages: [...state.coachMessages, { role: 'ai', text: "Sorry, I'm offline." }]
      }));
    } finally {
      set({ isCoachTyping: false });
    }
  },
  bypassMilestone: async (nodeId, answer) => {
    const state = get();
    if (state.profileId) {
      try {
        // @ts-ignore
        const { submitCheckpoint } = await import('../api/client');
        await submitCheckpoint(state.profileId, nodeId, answer);
      } catch (e) {
        console.error(e);
      }
    }
    
    // In a real app, this would update the graph edge states. 
    // For MVP frontend UI, we just mark the milestone as completed.
    if (state.activeMilestone?.id === nodeId) {
      const snapshot = {
        activeMilestone: state.activeMilestone,
        xp: state.xp,
        syncQueue: [...state.syncQueue],
      };
      const newQueue = state.isOffline ? [...state.syncQueue, nodeId] : state.syncQueue;
      set({ 
        previousStateSnapshot: snapshot,
        showUndoToast: true,
        activeMilestone: { ...state.activeMilestone, status: 'completed' },
        isTakingAssessment: false,
        syncQueue: newQueue,
        xp: state.xp + 150,
        showCelebration: true
      });
    } else {
      set({ isTakingAssessment: false });
    }
  },
  completeMilestoneViaIde: (nodeId) => set((state) => {
    if (state.activeMilestone?.id === nodeId) {
      const snapshot = {
        activeMilestone: state.activeMilestone,
        xp: state.xp,
        syncQueue: [...state.syncQueue],
        activeIdeNodeId: state.activeIdeNodeId,
      };
      const newQueue = state.isOffline ? [...state.syncQueue, nodeId] : state.syncQueue;
      return { 
        previousStateSnapshot: snapshot,
        showUndoToast: true,
        activeMilestone: { ...state.activeMilestone, status: 'completed' },
        activeIdeNodeId: null,
        syncQueue: newQueue,
        xp: state.xp + 150,
        showCelebration: true
      };
    }
    return { activeIdeNodeId: null };
  }),
  toggleTrustPanel: () => set((state) => ({ isTrustPanelOpen: !state.isTrustPanelOpen })),
  openIde: (nodeId) => set({ activeIdeNodeId: nodeId }),
  closeIde: () => set({ activeIdeNodeId: null }),
  openCoach: (nodeId) => set({ activeCoachNodeId: nodeId, coachMessages: [{ role: 'ai', text: "Hi! I'm your AI Coach. How can I help you with this milestone?" }] }),
  closeCoach: () => set({ activeCoachNodeId: null }),
  toggleOffline: () => set((state) => ({ isOffline: !state.isOffline })),
  syncOfflineProgress: () => set({ syncQueue: [] }),
  awardXp: (amount) => set((state) => ({ xp: state.xp + amount })),
  hideCelebration: () => set({ showCelebration: false }),
  hideUndoToast: () => set({ showUndoToast: false }),
  undoLastAction: () => set((state) => {
    if (state.previousStateSnapshot) {
      return {
        ...state.previousStateSnapshot,
        previousStateSnapshot: null,
        showUndoToast: false,
        showCelebration: false, // Cancel celebration if they undo instantly
      };
    }
    return {};
  }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
  openProofCard: (card) => set({ activeProofCard: card }),
  closeProofCard: () => set({ activeProofCard: null }),
  updateRankingPreference: (key, value) => set((state) => ({
    rankingPreferences: {
      ...state.rankingPreferences,
      [key]: value
    }
  })),
}));
