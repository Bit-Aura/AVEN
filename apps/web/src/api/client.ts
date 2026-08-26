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

export interface ScraperSourceInfo {
  id: string;
  name: string;
  description: string;
  requires_token: boolean;
  input_label?: string;
  input_type?: string;
  supports_custom_token?: boolean;
  identifier_description?: string;
  example_tokens?: string[];
}

export interface ScraperSourcesResponse {
  sources: ScraperSourceInfo[];
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
      'X-User-Email': 'demo@pathfinder.dev',
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

export const sendCoachMessage = async (skillId: string, message: string, profileId?: number) => {
  return await fetchApi('/coach/chat', {
    method: 'POST',
    body: JSON.stringify({
      skill_id: skillId,
      message: message,
      profile_id: profileId || null
    })
  });
};

export const submitDebugTelemetry = async (payload: any) => {
  const formattedPayload = payload?.snapshots ? payload : {
    milestone_id: payload?.milestone_id || 'default_milestone',
    snapshots: [
      {
        timestamp: Date.now() / 1000,
        diff: payload?.code || '+ initial solution implementation',
        lines_changed: [1],
        test_ran: true,
        test_passed: Boolean(payload?.passed),
        failed_test_names: payload?.passed ? [] : [payload?.error_type || 'test_failure'],
        execution_output: payload?.output || (payload?.passed ? 'Passed' : 'Failed')
      }
    ]
  };

  return await fetchApi('/diagnostics/debug-telemetry', {
    method: 'POST',
    body: JSON.stringify(formattedPayload)
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

export const pivotCareerRole = async (profileId: number, roleId: string) => {
  return await fetchApi('/career/pivot', {
    method: 'POST',
    body: JSON.stringify({
      profile_id: profileId,
      role_id: roleId
    })
  });
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

export const getScraperSources = async (): Promise<ScraperSourcesResponse> => {
  return await fetchApi('/scraper/sources');
};

export const scrapeJobs = async (payload: ScrapeJobsInput): Promise<ScrapeResult> => {
  return await fetchApi('/scraper/scrape', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

// =============================================================================
// PLATFORM ADMIN & RESOURCE MANAGEMENT CONTRACTS
// =============================================================================

export interface PendingActionItem {
  type: string;
  count: number;
  message: string;
  action_url: string;
}

export interface AdminOverviewResponse {
  total_users: number;
  active_users: number;
  total_mentors: number;
  pending_mentors: number;
  total_resources: number;
  pending_resources: number;
  pending_actions: PendingActionItem[];
}

export interface AdminSystemResponse {
  status: string;
  uptime_seconds: number;
  api_status: string;
  database_status: string;
  graph_db_status: string;
  scraper_sources_count: number;
  timestamp: string;
}

export interface AdminUserItem {
  id: number;
  clerk_id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminUsersResponse {
  users: AdminUserItem[];
  total: number;
}

export interface MentorApplicationItem {
  id: number;
  user_id: number;
  user_email: string;
  name: string;
  expertise: string;
  bio?: string | null;
  linkedin_url?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MentorApplicationsResponse {
  applications: MentorApplicationItem[];
  total: number;
}

export interface MentorApplyInput {
  name: string;
  expertise: string;
  bio?: string;
  linkedin_url?: string;
}

export interface PlatformResourceItem {
  id: number;
  title: string;
  content: string;
  url: string;
  resource_type: string;
  skill_id?: string | null;
  submitted_by_id?: number | null;
  submitted_by_email?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformResourcesResponse {
  resources: PlatformResourceItem[];
  total: number;
}

export interface ResourceCreateInput {
  title: string;
  content: string;
  url: string;
  resource_type?: string;
  skill_id?: string;
}

export interface ResourceUpdateInput {
  title?: string;
  content?: string;
  url?: string;
  resource_type?: string;
  skill_id?: string;
}

// Admin Overview & System
export const getAdminOverview = async (): Promise<AdminOverviewResponse> => {
  return await fetchApi('/admin/overview');
};

export const getAdminSystemStatus = async (): Promise<AdminSystemResponse> => {
  return await fetchApi('/admin/system');
};

// Admin Users
export const getAdminUsers = async (params?: {
  q?: string;
  role?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<AdminUsersResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set('q', params.q);
  if (params?.role) searchParams.set('role', params.role);
  if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  const qs = searchParams.toString();
  return await fetchApi(`/admin/users${qs ? `?${qs}` : ''}`);
};

export const updateUserStatus = async (userId: number, isActive: boolean): Promise<AdminUserItem> => {
  return await fetchApi(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive })
  });
};

export const updateUserRole = async (userId: number, role: string): Promise<AdminUserItem> => {
  return await fetchApi(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role })
  });
};

// Mentors
export const getAdminMentors = async (statusFilter?: string): Promise<MentorApplicationsResponse> => {
  const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
  return await fetchApi(`/admin/mentors${qs}`);
};

export const approveMentor = async (applicationId: number): Promise<MentorApplicationItem> => {
  return await fetchApi(`/admin/mentors/${applicationId}/approve`, {
    method: 'POST'
  });
};

export const rejectMentor = async (applicationId: number, reason?: string): Promise<MentorApplicationItem> => {
  return await fetchApi(`/admin/mentors/${applicationId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
};

export const applyAsMentor = async (payload: MentorApplyInput): Promise<MentorApplicationItem> => {
  return await fetchApi('/mentor/apply', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const getMyMentorApplication = async (): Promise<MentorApplicationItem | null> => {
  return await fetchApi('/mentor/application');
};

// Resources
export const getAdminResources = async (params?: {
  status?: string;
  resource_type?: string;
  skill_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<PlatformResourcesResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.resource_type) searchParams.set('resource_type', params.resource_type);
  if (params?.skill_id) searchParams.set('skill_id', params.skill_id);
  if (params?.q) searchParams.set('q', params.q);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  const qs = searchParams.toString();
  return await fetchApi(`/admin/resources${qs ? `?${qs}` : ''}`);
};

export const createAdminResource = async (payload: ResourceCreateInput): Promise<PlatformResourceItem> => {
  return await fetchApi('/admin/resources', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const updateAdminResource = async (resourceId: number, payload: ResourceUpdateInput): Promise<PlatformResourceItem> => {
  return await fetchApi(`/admin/resources/${resourceId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const deleteAdminResource = async (resourceId: number): Promise<{ status: string; message: string }> => {
  return await fetchApi(`/admin/resources/${resourceId}`, {
    method: 'DELETE'
  });
};

export const approveResource = async (resourceId: number): Promise<PlatformResourceItem> => {
  return await fetchApi(`/admin/resources/${resourceId}/approve`, {
    method: 'POST'
  });
};

export const rejectResource = async (resourceId: number, reason?: string): Promise<PlatformResourceItem> => {
  return await fetchApi(`/admin/resources/${resourceId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
};

export const submitMentorResource = async (payload: ResourceCreateInput): Promise<PlatformResourceItem> => {
  return await fetchApi('/resources/submit', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const getMyResourceSubmissions = async (): Promise<PlatformResourcesResponse> => {
  return await fetchApi('/resources/my-submissions');
};

export const getPublicResources = async (params?: {
  skill_id?: string;
  resource_type?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<PlatformResourcesResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.skill_id) searchParams.set('skill_id', params.skill_id);
  if (params?.resource_type) searchParams.set('resource_type', params.resource_type);
  if (params?.q) searchParams.set('q', params.q);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  const qs = searchParams.toString();
  return await fetchApi(`/resources${qs ? `?${qs}` : ''}`);
};

export const executeCode = async (language: string, code: string, nodeId: string, hiddenTests: string = "") => {
  return await fetchApi('/ide/execute', {
    method: 'POST',
    body: JSON.stringify({
      language,
      code,
      node_id: nodeId,
      hidden_tests: hiddenTests
    })
  });
};

export const getIdeProblem = async (nodeId: string, targetRole: string) => {
  const searchParams = new URLSearchParams();
  searchParams.set('node_id', nodeId);
  searchParams.set('target_role', targetRole);
  const qs = searchParams.toString();
  return await fetchApi(`/ide/problem?${qs}`);
};

// =============================================================================
// AI-POWERED CODING SANDBOX EVALUATION CONTRACTS
// =============================================================================

export interface ChallengeExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface CodingQuestionRequest {
  node_id: string;
  target_role?: string;
  skill_name?: string;
  difficulty?: string;
  programming_language?: string;
  profile_id?: number;
}

export interface CodingQuestionResponse {
  question_id: string;
  title: string;
  problem_statement: string;
  skill: string;
  difficulty: string;
  programming_language: string;
  starter_code: string;
  constraints: string[];
  examples: ChallengeExample[];
  expected_concepts: string[];
  evaluation_rubric: string[];
  hints: string[];
  hidden_tests?: string;
  description?: string;
  default_code?: string;
}

export interface CodeEvaluationRequest {
  node_id: string;
  programming_language: string;
  submitted_code: string;
  problem_statement?: string;
  problem_title?: string;
  question_id?: string;
  profile_id?: number;
  target_role?: string;
  skill_name?: string;
  expected_concepts?: string[];
  evaluation_rubric?: string[];
  hints?: string[];
}

export interface ComplexityAnalysis {
  time_complexity: string;
  space_complexity: string;
  details: string;
}

export interface CodeEvaluationResponse {
  score: number;
  verdict: 'excellent' | 'good' | 'partial' | 'needs_improvement' | 'incorrect';
  summary: string;
  correctness_score: number;
  reasoning_score: number;
  code_quality_score: number;
  strengths: string[];
  issues: string[];
  improvements: string[];
  detailed_feedback: string;
  complexity_analysis: ComplexityAnalysis;
  next_steps: string[];
  is_passing: boolean;
  evaluation_type: string;
  evaluation_note: string;
  submission_id?: number | null;
}

export const generateCodingChallenge = async (
  params: CodingQuestionRequest
): Promise<CodingQuestionResponse> => {
  return await fetchApi('/ide/question/generate', {
    method: 'POST',
    body: JSON.stringify(params)
  });
};

export const evaluateCodeSolution = async (
  payload: CodeEvaluationRequest
): Promise<CodeEvaluationResponse> => {
  return await fetchApi('/ide/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

