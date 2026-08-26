import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

export interface DiagnosticQuestion {
  question_id: string;
  question_text: string;
  options: string[];
  target_skill: string;
}

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

export interface ProofCardData {
  skillName?: string;
  role?: string;
  confidenceScore?: number;
  readiness_score?: number;
  evidenceTags?: string[];
  evidence_tags?: string[];
  mastered_skills?: string[];
  narrative?: string;
  issueDate?: string;
  issued_at?: string;
  credential_id?: string;
  signature?: string;
  algorithm?: string;
}

export interface RankingPreferences {
  speedVsDepth: number;
  theoryVsPractice: number;
  directedVsAutonomous: number;
  freeVsPaid: number;
  videoVsProject: number;
}

interface PathState {
  profileId: number | null;
  sessionId: number | null;
  userGoal: string | null;
  targetRole: string;
  readinessScore: number;
  readinessBreakdown: any | null;
  activePathPlan: any | null;
  pathExplanation: string | null;
  pathError: string | null;
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
  showHeatmap: boolean;
  isCommandPaletteOpen: boolean;
  isFocusMode: boolean;
  activeProofCard: ProofCardData | null;
  rankingPreferences: RankingPreferences;
  previousStateSnapshot: Partial<PathState> | null;
  syncQueue: string[];
  collaborators: Collaborator[];
  
  coachMessages: { role: 'user' | 'ai', text: string }[];
  isCoachTyping: boolean;
  coachPraiseCard: { message: string, badge?: ProofCardData } | null;
  setCoachPraiseCard: (card: { message: string, badge?: ProofCardData } | null) => void;
  currentAssessment: { question: string; options: string[] } | null;
  isFetchingAssessment: boolean;
  
  nodes: Node[];
  edges: Edge[];
  activeMilestone: Milestone | null;
  setProfileId: (id: number) => void;
  setGraph: (nodes: Node[], edges: Edge[]) => void;
  setActiveMilestone: (milestone: Milestone) => void;
  setUserGoal: (goal: string, email?: string) => Promise<void>;
  completeDiagnostic: (questionId: string, answer: string) => Promise<void>;
  fetchActivePath: (profileId?: number) => Promise<void>;
  fetchReadiness: (profileId?: number) => Promise<void>;
  simulateSkip: (nodeId: string, weeklyStudyHours?: number) => Promise<void>;
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
  toggleHeatmap: () => void;
  toggleCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleFocusMode: () => void;
  openProofCard: (card: ProofCardData) => void;
  closeProofCard: () => void;
  updateRankingPreference: (key: keyof RankingPreferences, value: number) => void;
  setLocalRankingPreference: (key: keyof RankingPreferences, value: number) => void;
  commitRankingPreferences: () => Promise<void>;

  submitIdeTelemetry: (payload: any) => Promise<void>;
  submitCalibration: (payload: any) => Promise<any>;
  fetchCareerAlternatives: (currentRoleId?: string, weeklyHours?: number) => Promise<any>;
  switchTargetRole: (roleId: string) => Promise<any>;
  fetchPlacementPlan: (payload: any) => Promise<any>;
  fetchMentorQueue: (payload: any) => Promise<any>;
  runSanityCheck: (payload: any) => Promise<any>;
  getVerifiedProofCard: (profileId?: number) => Promise<any>;

  currentUser: {
    id?: number;
    clerk_id?: string;
    email?: string;
    name?: string;
    role?: string;
    imageUrl?: string;
  } | null;
  setCurrentUser: (user: any) => void;
}

const getStoredProfileId = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('pathfinder_profile_id');
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('aven_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getStoredDiagnosticStatus = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('pathfinder_diagnostic_complete') === 'true';
  } catch {
    return false;
  }
};

const getStoredSessionId = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('pathfinder_session_id');
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
};

export const usePathStore = create<PathState>()((set, get) => ({
  currentUser: getStoredUser(),
  setCurrentUser: (user: any) => {
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem('aven_auth_user', JSON.stringify(user));
    }
    set({ currentUser: user });
  },
  profileId: getStoredProfileId(),
  sessionId: getStoredSessionId(),
  userGoal: null,
  targetRole: "Backend Software Engineer",
  readinessScore: 0,
  readinessBreakdown: null,
  activePathPlan: null,
  pathExplanation: null,
  pathError: null,
  diagnosticComplete: getStoredDiagnosticStatus(),
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
  showHeatmap: false,
  isCommandPaletteOpen: false,
  isFocusMode: false,
  activeProofCard: null,
  rankingPreferences: {
    speedVsDepth: 50,
    theoryVsPractice: 50,
    directedVsAutonomous: 50,
    freeVsPaid: 50,
    videoVsProject: 50,
  },
  previousStateSnapshot: null,
  syncQueue: [],
  collaborators: [
    { id: 'u1', name: 'You', color: 'bg-indigo-500', isOnline: true },
    { id: 'u2', name: 'Sriram (Mentor)', color: 'bg-emerald-500', isOnline: true },
    { id: 'u3', name: 'Alex (Peer)', color: 'bg-cyan-500', isOnline: false }
  ],
  coachMessages: [{ role: 'ai', text: "Hi! I'm your AI Coach. How can I help you with this milestone?" }],
  isCoachTyping: false,
  coachPraiseCard: null,
  setCoachPraiseCard: (card) => set({ coachPraiseCard: card }),
  currentAssessment: null,
  isFetchingAssessment: false,
  nodes: [],
  edges: [],
  activeMilestone: null,

  setProfileId: (id: number) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pathfinder_profile_id', id.toString());
      } catch {}
    }
    set({ profileId: id });
  },

  setGraph: (nodes, edges) => set({ nodes, edges }),
  setActiveMilestone: (activeMilestone) => set({ activeMilestone }),

  setUserGoal: async (userGoal, email = 'demo@pathfinder.dev') => {
    set({ isLoading: true, pathError: null });
    try {
      const { submitGoal } = await import('../api/client');
      const res = await submitGoal(email, userGoal);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('pathfinder_profile_id', res.profile_id.toString());
          if (res.session_id) localStorage.setItem('pathfinder_session_id', res.session_id.toString());
        } catch {}
      }
      set({ 
        userGoal, 
        profileId: res.profile_id, 
        sessionId: res.session_id,
        nextQuestion: res.next_question,
        targetRole: res.intent?.target_goal || "Backend Software Engineer"
      });
    } catch (e: any) {
      console.error(e);
      set({ pathError: e.message || "Failed to submit goal." });
    } finally {
      set({ isLoading: false });
    }
  },

  completeDiagnostic: async (questionId, answer) => {
    const { sessionId } = get();
    if (sessionId) {
      set({ isLoading: true });
      try {
        const { submitDiagnostic } = await import('../api/client');
        const res = await submitDiagnostic(sessionId, questionId, answer);
        if (res.status === 'completed') {
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
          
          const nodes: Node[] = path.map((n: any, idx: number) => ({
            id: n.id,
            position: { x: 250, y: idx * 120 + 50 },
            data: { 
              label: n.name || n.id,
              status: idx === 0 ? 'active' : 'locked',
              skillId: n.id
            },
            type: 'custom'
          }));
          
          const edges: Edge[] = [];
          for (let i = 0; i < path.length - 1; i++) {
            edges.push({
              id: `e-${path[i].id}-${path[i+1].id}`,
              source: path[i].id,
              target: path[i+1].id,
              animated: i === 0,
              style: { stroke: i === 0 ? '#6366f1' : '#334155', strokeWidth: 2 }
            });
          }

          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('pathfinder_diagnostic_complete', 'true');
            } catch {}
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
      } catch (e: any) {
        console.error(e);
        set({ pathError: e.message || "Diagnostic submission failed." });
      } finally {
        set({ isLoading: false });
      }
    } else {
      set({ diagnosticComplete: true });
    }
  },

  fetchActivePath: async (explicitProfileId) => {
    const targetId = explicitProfileId || get().profileId || getStoredProfileId() || 1;
    set({ isLoading: true, pathError: null });
    try {
      const { getPath } = await import('../api/client');
      const res = await getPath(targetId);
      
      const allSkills: string[] = res.plan?.all_ordered_skills || res.plan?.remaining_path || [];
      const remainingSkills: string[] = res.plan?.remaining_path || allSkills;
      const activeId = remainingSkills[0] || allSkills[0] || '';
      
      const nodes: Node[] = allSkills.map((skillId: string, idx: number) => {
        const isCompleted = res.plan?.completed_skills?.includes(skillId) || (!remainingSkills.includes(skillId) && allSkills.indexOf(skillId) < allSkills.indexOf(activeId));
        const isActive = skillId === activeId;
        const formattedName = skillId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        
        return {
          id: skillId,
          position: { x: 250, y: idx * 120 + 50 },
          data: { 
            label: formattedName,
            status: isCompleted ? 'completed' : isActive ? 'active' : 'locked',
            skillId
          },
          type: 'custom'
        };
      });

      const edges: Edge[] = [];
      for (let i = 0; i < allSkills.length - 1; i++) {
        edges.push({
          id: `e-${allSkills[i]}-${allSkills[i+1]}`,
          source: allSkills[i],
          target: allSkills[i+1],
          animated: allSkills[i] === activeId,
          style: { stroke: allSkills[i] === activeId ? '#6366f1' : '#334155', strokeWidth: 2 }
        });
      }

      const activeMilestone = activeId ? {
        id: activeId,
        title: activeId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        explanation: res.explanation || 'Based on your skill baseline, this is the highest priority milestone in your deterministic path.',
        status: 'active' as const
      } : null;

      set({
        profileId: targetId,
        nodes,
        edges,
        activeMilestone,
        pathExplanation: res.explanation,
        activePathPlan: res.plan,
        isLoading: false
      });
    } catch (e: any) {
      console.warn("fetchActivePath fallback", e);
      // Sensible initial demo path if profile 1 has not been seeded in local DB yet
      const fallbackSkills = [
        "python_basics",
        "sql_relational_design",
        "http_methods_rest",
        "fastapi_microservices"
      ];
      const nodes: Node[] = fallbackSkills.map((skillId, idx) => ({
        id: skillId,
        position: { x: 250, y: idx * 120 + 50 },
        data: {
          label: skillId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          status: idx === 0 ? 'active' : 'locked',
          skillId
        },
        type: 'custom'
      }));
      const edges: Edge[] = [
        { id: 'e-1-2', source: fallbackSkills[0], target: fallbackSkills[1], animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
        { id: 'e-2-3', source: fallbackSkills[1], target: fallbackSkills[2], style: { stroke: '#334155', strokeWidth: 2 } },
        { id: 'e-3-4', source: fallbackSkills[2], target: fallbackSkills[3], style: { stroke: '#334155', strokeWidth: 2 } },
      ];
      set({
        nodes,
        edges,
        activeMilestone: {
          id: fallbackSkills[0],
          title: "Python Basics & Data Structures",
          explanation: "Master core syntax, data structures, and async paradigms as the foundation for backend engineering.",
          status: 'active'
        },
        pathExplanation: "Deterministic prerequisite path plotted for Backend Software Engineer.",
        isLoading: false
      });
    }

  },

  fetchReadiness: async (explicitProfileId) => {
    const targetId = explicitProfileId || get().profileId || getStoredProfileId() || 1;
    try {
      const { getReadiness } = await import('../api/client');
      const res = await getReadiness(targetId);
      if (res && res.readiness) {
        set({
          readinessScore: Math.round((res.readiness.readiness_score || 0.65) * 100),
          readinessBreakdown: res.readiness,
          activeProofCard: res.proof_card || null,
          targetRole: res.target_role || get().targetRole
        });
      }
    } catch (e) {
      console.warn("fetchReadiness baseline fallback", e);
      if (get().readinessScore === 0) {
        set({ readinessScore: 42 });
      }
    }
  },

  simulateSkip: async (nodeId, weeklyStudyHours = 10) => {
    const targetId = get().profileId || getStoredProfileId() || 1;
    set({ isSimulatingSkip: true, simulatedConsequence: "Calculating downstream topological impact..." });
    try {
      const { simulateSkipDelta } = await import('../api/client');
      const res = await simulateSkipDelta(targetId, nodeId, weeklyStudyHours);
      set({
        isSimulatingSkip: true,
        simulatedConsequence: res.verdict || `Skipping '${nodeId}' introduces downstream friction (+${res.delta_days_calendar || 0} calendar days).`
      });
    } catch (e) {
      console.error(e);
      set({ 
        isSimulatingSkip: true, 
        simulatedConsequence: "Skipping this fundamental concept removes dependent downstream modules from your immediate path." 
      });
    }
  },

  cancelSimulation: () => set({ isSimulatingSkip: false, simulatedConsequence: null }),
  startAssessment: () => set({ isTakingAssessment: true }),
  stopAssessment: () => set({ isTakingAssessment: false }),

  fetchAssessment: async (nodeId) => {
    set({ isFetchingAssessment: true, currentAssessment: null });
    try {
      const { getCheckpointQuestion } = await import('../api/client');
      const res = await getCheckpointQuestion(nodeId);
      set({ currentAssessment: res });
    } catch (e) {
      console.error(e);
      set({ currentAssessment: { question: `Demonstrate mastery for ${nodeId}`, options: ["Submit code implementation"] } });
    } finally {
      set({ isFetchingAssessment: false });
    }
  },

  sendCoachMessage: async (nodeId, message) => {
    const targetId = get().profileId || getStoredProfileId() || 1;
    set((state) => ({ 
      coachMessages: [...state.coachMessages, { role: 'user', text: message }],
      isCoachTyping: true 
    }));
    try {
      const { sendCoachMessage } = await import('../api/client');
      const res = await sendCoachMessage(nodeId, message, targetId);
      set((state) => ({ 
        coachMessages: [...state.coachMessages, { role: 'ai', text: res.reply }]
      }));
    } catch (e) {
      console.error(e);
      set((state) => ({ 
        coachMessages: [...state.coachMessages, { role: 'ai', text: "I'm currently unable to reach the coach engine. Please verify the backend service is active." }]
      }));
    } finally {
      set({ isCoachTyping: false });
    }
  },

  bypassMilestone: async (nodeId, answer) => {
    const state = get();
    const targetId = state.profileId || getStoredProfileId() || 1;
    
    try {
      const { submitCheckpoint } = await import('../api/client');
      await submitCheckpoint(targetId, nodeId, answer);
      await state.fetchActivePath(targetId);
      await state.fetchReadiness(targetId);
    } catch (e) {
      console.error(e);
    }
    
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
  openCoach: (nodeId) => set({ activeCoachNodeId: nodeId, coachMessages: [{ role: 'ai', text: `Hi! I'm your AI Coach. How can I assist you with "${nodeId.replace(/_/g, ' ')}"?` }] }),
  closeCoach: () => set({ activeCoachNodeId: null }),
  toggleOffline: () => set((state) => ({ isOffline: !state.isOffline })),
  syncOfflineProgress: () => set({ syncQueue: [] }),
  awardXp: (amount) => set((state) => ({ xp: state.xp + amount })),
  hideCelebration: () => set({ showCelebration: false }),
  hideUndoToast: () => set({ showUndoToast: false }),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
  undoLastAction: () => set((state) => {
    if (state.previousStateSnapshot) {
      return {
        ...state.previousStateSnapshot,
        previousStateSnapshot: null,
        showUndoToast: false,
        showCelebration: false,
      };
    }
    return {};
  }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
  openProofCard: (card) => set({ activeProofCard: card }),
  closeProofCard: () => set({ activeProofCard: null }),
  
  setLocalRankingPreference: (key, value) => {
    set((state) => ({
      rankingPreferences: { ...state.rankingPreferences, [key]: value }
    }));
  },

  commitRankingPreferences: async () => {
    const preferences = get().rankingPreferences;
    const targetId = get().profileId || getStoredProfileId() || 1;
    try {
      const { updateWeights } = await import('../api/client');
      await updateWeights({
        profile_id: targetId,
        speed: preferences.speedVsDepth / 100,
        depth: preferences.theoryVsPractice / 100,
        cost: preferences.freeVsPaid / 100
      });
      await get().fetchActivePath(targetId);
    } catch (e) {
      console.error("commitRankingPreferences failed", e);
    }
  },

  updateRankingPreference: async (key, value) => {
    const updated = { ...get().rankingPreferences, [key]: value };
    set({ rankingPreferences: updated });
    const targetId = get().profileId || getStoredProfileId() || 1;
    try {
      const { updateWeights } = await import('../api/client');
      await updateWeights({
        profile_id: targetId,
        speed: updated.speedVsDepth / 100,
        depth: updated.theoryVsPractice / 100,
        cost: updated.freeVsPaid / 100
      });
      await get().fetchActivePath(targetId);
    } catch (e) {
      console.error("updateWeights failed", e);
    }
  },

  submitIdeTelemetry: async (payload) => {
    try {
      const { submitDebugTelemetry } = await import('../api/client');
      const telemetryInput = payload.snapshots ? payload : {
        milestone_id: payload.milestone_id,
        snapshots: [
          {
            timestamp: Date.now() / 1000,
            diff: payload.code || '+ initial solution implementation',
            lines_changed: [1],
            test_ran: true,
            test_passed: Boolean(payload.passed),
            failed_test_names: payload.passed ? [] : [payload.error_type || 'test_failure'],
            execution_output: payload.output || (payload.passed ? 'Passed' : 'Failed')
          }
        ]
      };
      const res = await submitDebugTelemetry(telemetryInput);
      if (res?.process_praise) {
        set({
          coachPraiseCard: {
            message: res.process_praise,
            badge: res.thrash_index < 0.3 ? {
              skillName: "Systematic Debugging",
              confidenceScore: 0.9,
              evidenceTags: ["Low Thrash", res.strategy || "SYSTEMATIC"],
              narrative: res.process_praise,
              issueDate: new Date().toISOString()
            } : undefined
          }
        });
      }
    } catch (e) {
      console.error("Telemetry failed", e);
    }
  },

  submitCalibration: async (payload) => {
    try {
      const { evaluateCalibration } = await import('../api/client');
      return await evaluateCalibration(payload);
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  fetchCareerAlternatives: async (currentRoleId = 'backend_swe', weeklyHours = 10) => {
    const targetId = get().profileId || getStoredProfileId() || 1;
    try {
      const { getCareerAlternatives } = await import('../api/client');
      return await getCareerAlternatives(targetId, currentRoleId, weeklyHours);
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  switchTargetRole: async (roleId: string) => {
    const targetId = get().profileId || getStoredProfileId() || 1;
    set({ isLoading: true });
    try {
      const { pivotCareerRole } = await import('../api/client');
      const res = await pivotCareerRole(targetId, roleId);
      if (res && res.target_role) {
        set({ targetRole: res.target_role });
      }
      await get().fetchActivePath(targetId);
      await get().fetchReadiness(targetId);
      set({ showCelebration: true });
      return res;
    } catch (e) {
      console.error("switchTargetRole failed", e);
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPlacementPlan: async (payload) => {
    try {
      const { generatePlacementPlan } = await import('../api/client');
      return await generatePlacementPlan(payload);
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  fetchMentorQueue: async (payload) => {
    try {
      const { generateMentorTriage } = await import('../api/client');
      return await generateMentorTriage(payload);
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  runSanityCheck: async (payload) => {
    try {
      const { checkRoadmapSanity } = await import('../api/client');
      return await checkRoadmapSanity(payload);
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  getVerifiedProofCard: async (explicitProfileId) => {
    const targetId = explicitProfileId || get().profileId || getStoredProfileId() || 1;
    try {
      const { getProofCard } = await import('../api/client');
      return await getProofCard(targetId);
    } catch (e) {
      console.error(e);
      return null;
    }
  }
}));
