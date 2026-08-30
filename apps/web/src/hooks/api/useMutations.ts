import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  submitGoal,
  submitDiagnostic,
  simulateSkipDelta,
  sendCoachMessage as sendCoachMessageApi,
  submitCheckpoint,
  submitDebugTelemetry,
  evaluateCalibration,
  pivotCareerRole,
  updateWeights,
} from '../../api/client';
import { usePathStore } from '../../store/usePathStore';

// Helper to get active profile ID
const useActiveProfileId = () => {
  const storeProfileId = usePathStore((s) => s.profileId);
  if (storeProfileId) return storeProfileId;
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('pathfinder_profile_id');
    if (local) return parseInt(local, 10);
  }
  return 1; // fallback
};

export const useSubmitGoalMutation = () => {
  const queryClient = useQueryClient();
  const setProfileId = usePathStore(s => s.setProfileId);
  const setUserGoalStore = usePathStore(s => s.setUserGoal); // Only sets goal text now

  return useMutation({
    mutationFn: async ({ email, goal }: { email: string; goal: string }) => {
      const res = await submitGoal(email, goal);
      return { res, goal };
    },
    onSuccess: ({ res, goal }) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('pathfinder_profile_id', res.profile_id.toString());
          if (res.session_id) localStorage.setItem('pathfinder_session_id', res.session_id.toString());
        } catch {}
      }
      setProfileId(res.profile_id);
      setUserGoalStore(goal);
      queryClient.invalidateQueries({ queryKey: ['activePath', res.profile_id] });
      queryClient.invalidateQueries({ queryKey: ['readiness', res.profile_id] });
    },
  });
};

export const useSubmitDiagnosticMutation = () => {
  const queryClient = useQueryClient();
  const profileId = useActiveProfileId();

  return useMutation({
    mutationFn: async ({ sessionId, questionId, answer }: { sessionId: number; questionId: string; answer: string }) => {
      return await submitDiagnostic(sessionId, questionId, answer);
    },
    onSuccess: (res) => {
      if (res.status === 'completed') {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('pathfinder_diagnostic_complete', 'true');
          } catch {}
        }
        // Invalidate path so it fetches the real one after diagnostic
        queryClient.invalidateQueries({ queryKey: ['activePath', profileId] });
        queryClient.invalidateQueries({ queryKey: ['readiness', profileId] });
      }
    },
  });
};

export const useSimulateSkipMutation = () => {
  const profileId = useActiveProfileId();

  return useMutation({
    mutationFn: async ({ nodeId, weeklyStudyHours = 10 }: { nodeId: string; weeklyStudyHours?: number }) => {
      return await simulateSkipDelta(profileId, nodeId, weeklyStudyHours);
    },
  });
};

export const useSendCoachMessageMutation = () => {
  const profileId = useActiveProfileId();

  return useMutation({
    mutationFn: async ({ nodeId, message }: { nodeId: string; message: string }) => {
      return await sendCoachMessageApi(nodeId, message, profileId);
    },
  });
};

export const useBypassMilestoneMutation = () => {
  const queryClient = useQueryClient();
  const profileId = useActiveProfileId();

  return useMutation({
    mutationFn: async ({ nodeId, answer }: { nodeId: string; answer: string }) => {
      return await submitCheckpoint(profileId, nodeId, answer);
    },
    onSuccess: () => {
      // Refresh path and readiness after completion
      queryClient.invalidateQueries({ queryKey: ['activePath', profileId] });
      queryClient.invalidateQueries({ queryKey: ['readiness', profileId] });
    },
  });
};

export const useSwitchTargetRoleMutation = () => {
  const queryClient = useQueryClient();
  const profileId = useActiveProfileId();
  
  return useMutation({
    mutationFn: async (roleId: string) => {
      return await pivotCareerRole(profileId, roleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activePath', profileId] });
      queryClient.invalidateQueries({ queryKey: ['readiness', profileId] });
    },
  });
};

export const useUpdateWeightsMutation = () => {
  const queryClient = useQueryClient();
  const profileId = useActiveProfileId();

  return useMutation({
    mutationFn: async (payload: { speed: number; depth: number; cost: number }) => {
      return await updateWeights({
        profile_id: profileId,
        speed: payload.speed / 100,
        depth: payload.depth / 100,
        cost: payload.cost / 100
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activePath', profileId] });
    }
  });
};

export const useSubmitIdeTelemetryMutation = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
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
      return await submitDebugTelemetry(telemetryInput);
    },
  });
};

export const useSubmitCalibrationMutation = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      return await evaluateCalibration(payload);
    },
  });
};
