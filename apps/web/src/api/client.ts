const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }
  return res.json();
}

export const getHealth = async () => {
  return await fetchApi('/health');
};

export const submitGoal = async (userEmail: string, goalText: string, modality: string = 'project') => {
  return await fetchApi('/goal', {
    method: 'POST',
    body: JSON.stringify({
      user_email: userEmail,
      goal_text: goalText,
      preferred_modality: modality
    })
  });
};

export const submitDiagnostic = async (sessionId: number, questionId: string, answer: string) => {
  return await fetchApi('/diagnostic/submit', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      question_id: questionId,
      answer: answer
    })
  });
};

export const getCheckpointQuestion = async (skillId: string) => {
  return await fetchApi(`/checkpoint/${skillId}`);
};

export const submitCheckpoint = async (profileId: number, skillId: string, userAnswer: string) => {
  return await fetchApi('/checkpoint/submit', {
    method: 'POST',
    body: JSON.stringify({
      profile_id: profileId,
      skill_id: skillId,
      user_answer: userAnswer
    })
  });
};

export const sendCoachMessage = async (skillId: string, message: string) => {
  return await fetchApi('/coach/chat', {
    method: 'POST',
    body: JSON.stringify({
      skill_id: skillId,
      message: message
    })
  });
};

export const submitDebugTelemetry = async (payload: any) => {
  return await fetchApi('/diagnostics/debug-telemetry', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const simulateSkipDelta = async (profileId: number, skippedSkillId: string, weeklyStudyHours: number) => {
  return await fetchApi('/simulate-skip-delta', {
    method: 'POST',
    body: JSON.stringify({
      profile_id: profileId,
      skipped_skill_id: skippedSkillId,
      weekly_study_hours: weeklyStudyHours
    })
  });
};

export const evaluateCalibration = async (payload: any) => {
  return await fetchApi('/calibration/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const getCareerAlternatives = async (profileId: number, currentRoleId: string = 'backend_swe', weeklyHours: number = 10) => {
  return await fetchApi(`/career/alternatives/${profileId}?current_role_id=${currentRoleId}&weekly_study_hours=${weeklyHours}`);
};

export const generatePlacementPlan = async (payload: any) => {
  return await fetchApi('/placement/plan', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const generateMentorTriage = async (payload: any) => {
  return await fetchApi('/placement/triage', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const checkRoadmapSanity = async (payload: any) => {
  return await fetchApi('/roadmap/sanity-check', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};
