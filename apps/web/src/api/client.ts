const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || `${BACKEND_URL}/api/v1`;

export interface GoalInput {
  user_email?: string;
  goal_text: string;
  preferred_modality?: string;
}

export interface SliderWeightsInput {
  profile_id: number;
  speed?: number;
  depth?: number;
  cost?: number;
}

export interface ScrapeJobsInput {
  source: string;
  board_token: string;
  company_name?: string;
  limit?: number;
}

export interface ScrapedJob {
  external_id: string;
  source: string;
  title: string;
  company?: string;
  location?: string;
  job_type?: string;
  description?: string;
  url?: string;
  posted_date?: string;
  scraped_at: string;
}

export interface ScrapeResult {
  source: string;
  board_identifier: string;
  total_fetched: number;
  total_valid: number;
  total_deduplicated: number;
  jobs: ScrapedJob[];
  errors: string[];
  timestamp: string;
}

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`API error (${res.status} ${res.statusText}): ${errorBody}`);
  }
  return res.json();
}

export const getHealth = async () => {
  const res = await fetch(`${BACKEND_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
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

export const getPath = async (profileId: number) => {
  return await fetchApi(`/path/${profileId}`);
};

export const getReadiness = async (profileId: number) => {
  return await fetchApi(`/readiness/${profileId}`);
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

export const updateWeights = async (payload: SliderWeightsInput) => {
  return await fetchApi('/weights/update', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const getProofCard = async (profileId: number) => {
  return await fetchApi(`/proof-card/${profileId}`);
};

export const getProofCardSvgUrl = (profileId: number) => {
  return `${BASE_URL}/proof-card/${profileId}/svg`;
};

export const verifyProofCard = async (cardData: any) => {
  return await fetchApi('/proof-card/verify', {
    method: 'POST',
    body: JSON.stringify(cardData)
  });
};

export const getScraperSources = async () => {
  return await fetchApi('/scraper/sources');
};

export const scrapeJobs = async (payload: ScrapeJobsInput): Promise<ScrapeResult> => {
  return await fetchApi('/scraper/scrape', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

