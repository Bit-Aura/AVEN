import { useQuery } from '@tanstack/react-query';
import {
  getPath,
  getReadiness,
  getCheckpointQuestion,
  getCareerAlternatives,
  generatePlacementPlan,
  generateMentorTriage,
  sanityCheckRoadmap,
  getProofCard,
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

export const useActivePathQuery = () => {
  const profileId = useActiveProfileId();

  return useQuery({
    queryKey: ['activePath', profileId],
    queryFn: async () => {
      const res = await getPath(profileId);
      
      const allSkills: string[] = res.plan?.all_ordered_skills || res.plan?.remaining_path || [];
      const remainingSkills: string[] = res.plan?.remaining_path || allSkills;
      const activeId = remainingSkills[0] || allSkills[0] || '';
      
      const nodes: any[] = allSkills.map((skillId: string, idx: number) => {
        const isCompleted = res.plan?.completed_skills?.includes(skillId) || (!remainingSkills.includes(skillId) && allSkills.indexOf(skillId) < allSkills.indexOf(activeId));
        const isActive = skillId === activeId;
        const cleanId = skillId.replace(/^[a-z0-9_-]+::/, '');
        const formattedName = cleanId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        
        return {
          id: skillId,
          position: { x: 250 + Math.sin(idx * Math.PI / 2) * 200, y: idx * 160 + 50 },
          data: { 
            label: formattedName,
            status: isCompleted ? 'completed' : isActive ? 'active' : 'locked',
            skillId
          },
          type: 'custom'
        };
      });

      const edges: any[] = [];
      for (let i = 0; i < allSkills.length - 1; i++) {
        edges.push({
          id: `e-${allSkills[i]}-${allSkills[i+1]}`,
          source: allSkills[i],
          target: allSkills[i+1],
          type: 'smoothstep',
          animated: allSkills[i] === activeId,
          style: { stroke: allSkills[i] === activeId ? '#818cf8' : '#334155', strokeWidth: allSkills[i] === activeId ? 3 : 2 }
        });
      }

      const activeMilestone = activeId ? {
        id: activeId,
        title: activeId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        explanation: res.explanation || 'Based on your skill baseline, this is the highest priority milestone in your deterministic path.',
        status: 'active' as const
      } : null;

      return {
        nodes,
        edges,
        activeMilestone,
        pathExplanation: res.explanation,
        activePathPlan: res.plan,
        raw: res
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useReadinessQuery = () => {
  const profileId = useActiveProfileId();

  return useQuery({
    queryKey: ['readiness', profileId],
    queryFn: async () => {
      const res = await getReadiness(profileId);
      return {
        readinessScore: Math.round((res?.readiness?.readiness_score || 0.65) * 100),
        readinessBreakdown: res?.readiness,
        activeProofCard: res?.proof_card || null,
        targetRole: res?.target_role || 'Backend Software Engineer'
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAssessmentQuery = (nodeId: string | null) => {
  return useQuery({
    queryKey: ['assessment', nodeId],
    queryFn: async () => {
      if (!nodeId) throw new Error("No nodeId provided");
      return await getCheckpointQuestion(nodeId);
    },
    enabled: !!nodeId,
    staleTime: Infinity, // Assessments don't usually change
  });
};

export const useCareerAlternativesQuery = (currentRoleId = 'backend_swe', weeklyHours = 10) => {
  const profileId = useActiveProfileId();
  return useQuery({
    queryKey: ['careerAlternatives', profileId, currentRoleId, weeklyHours],
    queryFn: () => getCareerAlternatives(profileId, currentRoleId, weeklyHours),
  });
};

export const useProofCardQuery = () => {
  const profileId = useActiveProfileId();
  return useQuery({
    queryKey: ['proofCard', profileId],
    queryFn: () => getProofCard(profileId),
  });
};

export const usePlacementPlanQuery = (payload: any) => {
  return useQuery({
    queryKey: ['placementPlan', payload],
    queryFn: () => generatePlacementPlan(payload),
    enabled: !!payload,
  });
};

export const useMentorTriageQuery = (payload: any) => {
  return useQuery({
    queryKey: ['mentorTriage', payload],
    queryFn: () => generateMentorTriage(payload),
    enabled: !!payload,
  });
};

export const useSanityCheckQuery = (payload: any) => {
  return useQuery({
    queryKey: ['sanityCheck', payload],
    queryFn: () => sanityCheckRoadmap(payload),
    enabled: !!payload,
  });
};
