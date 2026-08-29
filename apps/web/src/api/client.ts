/**
 * Enterprise-grade implementation of BACKEND_URL.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
/**
 * Enterprise-grade implementation of BASE_URL.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
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
  let authToken: string | null = null;
  let storedEmail: string | null = null;
  let storedClerkId: string | null = null;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('aven_auth_token');
    const storedUser = localStorage.getItem('aven_auth_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        storedEmail = u.email;
        storedClerkId = u.clerk_id || null;
      } catch (e) {}
    }
  }

  const authHeaders: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    authHeaders['Content-Type'] = 'application/json';
  }

  if (authToken) {
    authHeaders['Authorization'] = `Bearer ${authToken}`;
  }
  if (storedEmail) {
    authHeaders['X-User-Email'] = storedEmail;
  } else {
    authHeaders['X-User-Email'] = endpoint.startsWith('/admin') ? 'admin@aven.com' : 'demo@pathfinder.dev';
  }
  if (storedClerkId) {
    authHeaders['X-Clerk-User-Id'] = storedClerkId;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`API error (${res.status} ${res.statusText}): ${errorBody}`);
  }
  return res.json();
}

// --- Auth Endpoints ---

export const downloadCertificate = async (profileId: number, courseName: string, roleId: string) => {
  const response = await fetch(`${BASE_URL}/certificates/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, course_name: courseName, role_id: roleId }),
  });
  if (!response.ok) throw new Error('Failed to download certificate');
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AVEN_Certificate_${courseName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const loginUser = async (payload: { email: string; password: string }) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = 'Login failed.';
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.detail || detail;
    } catch {
      detail = errText || detail;
    }
    throw new Error(detail);
  }
  const data = await res.json();
  if (typeof window !== 'undefined') {
    localStorage.setItem('aven_auth_token', data.access_token);
    localStorage.setItem('aven_auth_user', JSON.stringify(data.user));
  }
  return data;
};

export const registerUser = async (payload: { email: string; password: string; name?: string; role?: string }) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = 'Registration failed.';
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.detail || detail;
    } catch {
      detail = errText || detail;
    }
    throw new Error(detail);
  }
  const data = await res.json();
  if (typeof window !== 'undefined') {
    localStorage.setItem('aven_auth_token', data.access_token);
    localStorage.setItem('aven_auth_user', JSON.stringify(data.user));
  }
  return data;
};

export interface ClerkSyncInput {
  clerk_id: string;
  email: string;
  name?: string;
  image_url?: string;
  role?: string;
}

export interface ClerkSyncResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    clerk_id?: string;
    email: string;
    name?: string;
    role: string;
    is_active: boolean;
  };
  profile_id: number;
}

export const syncClerkUser = async (payload: ClerkSyncInput): Promise<ClerkSyncResponse> => {
  const res = await fetch(`${BASE_URL}/auth/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = 'Clerk sync failed.';
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.detail || detail;
    } catch {
      detail = errText || detail;
    }
    throw new Error(detail);
  }
  const data: ClerkSyncResponse = await res.json();
  if (typeof window !== 'undefined') {
    if (data.access_token) {
      localStorage.setItem('aven_auth_token', data.access_token);
    }
    if (data.user) {
      localStorage.setItem('aven_auth_user', JSON.stringify(data.user));
    }
    if (data.profile_id) {
      localStorage.setItem('pathfinder_profile_id', String(data.profile_id));
    }
  }
  return data;
};

export const fetchCurrentUser = async () => {
  return await fetchApi('/auth/me');
};

export const updateUserProfile = async (payload: { name: string; email: string }) => {
  return await fetchApi('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const updateUserPassword = async (payload: { current_password: string; new_password: string }) => {
  return await fetchApi('/auth/password', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const logoutUser = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('aven_auth_token');
    localStorage.removeItem('aven_auth_user');
  }
};

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

export const fetchPlacementCompanies = async () => {
  return await fetchApi('/placement/companies');
};

export const generateMentorTriage = async (payload: any) => {
  return await fetchApi('/placement/triage', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const fetchMentorCohorts = async () => {
  return await fetchApi('/mentor/cohorts');
};

export const fetchCohortDrives = async (cohortId: number) => {
  return await fetchApi(`/mentor/cohorts/${cohortId}/drives`);
};

export const fetchCohortTriage = async (
  cohortId: number,
  params?: {
    placement_drive_id?: number;
    breakthrough_only?: boolean;
    escalations_only?: boolean;
    high_urgency_only?: boolean;
    active_interventions_only?: boolean;
  }
) => {
  const query = new URLSearchParams();
  if (params?.placement_drive_id) query.set('placement_drive_id', String(params.placement_drive_id));
  if (params?.breakthrough_only) query.set('breakthrough_only', 'true');
  if (params?.escalations_only) query.set('escalations_only', 'true');
  if (params?.high_urgency_only) query.set('high_urgency_only', 'true');
  if (params?.active_interventions_only) query.set('active_interventions_only', 'true');

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return await fetchApi(`/mentor/cohorts/${cohortId}/triage${queryString}`);
};

export const fetchLearnerMentorDetail = async (profileId: number) => {
  return await fetchApi(`/mentor/learners/${profileId}/detail`);
};

export const createIntervention = async (payload: any) => {
  return await fetchApi('/mentor/interventions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateIntervention = async (id: number, payload: any) => {
  return await fetchApi(`/mentor/interventions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const fetchInterventions = async (params?: { cohort_id?: number; profile_id?: number; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.cohort_id) query.set('cohort_id', String(params.cohort_id));
  if (params?.profile_id) query.set('profile_id', String(params.profile_id));
  if (params?.status) query.set('status', params.status);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return await fetchApi(`/mentor/interventions${queryString}`);
};

// --- Mentor Connect Endpoints ---

export const createMentorSessionRequest = async (payload: {
  title: string;
  description: string;
  reason: string;
  skill_id?: string;
  requested_duration_minutes?: number;
}) => {
  return await fetchApi('/mentor-connect/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const fetchLearnerSessionRequests = async () => {
  return await fetchApi('/mentor-connect/my-requests');
};

const resolveId = (id: any): number => {
  if (typeof id === 'object' && id !== null) {
    return Number(id.id || id.requestId || 0);
  }
  return Number(id);
};

export const cancelSessionRequest = async (requestId: number | any) => {
  return await fetchApi(`/mentor-connect/requests/${resolveId(requestId)}/cancel`, {
    method: 'POST',
  });
};

export const fetchOpenMentorRequests = async () => {
  return await fetchApi('/mentor-connect/open-requests');
};

export const acceptMentorRequest = async (requestId: number | any) => {
  return await fetchApi(`/mentor-connect/requests/${resolveId(requestId)}/accept`, {
    method: 'POST',
  });
};

export const scheduleMentorSession = async (
  requestId: number | any,
  payload: { scheduled_at: string; duration_minutes: number }
) => {
  return await fetchApi(`/mentor-connect/requests/${resolveId(requestId)}/schedule`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const fetchMentorAssignedSessions = async (statusFilter?: string) => {
  const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
  return await fetchApi(`/mentor-connect/mentor-sessions${query}`);
};

export const startMentorSession = async (requestId: number | any) => {
  return await fetchApi(`/mentor-connect/requests/${resolveId(requestId)}/start`, {
    method: 'POST',
  });
};

export const completeMentorSession = async (
  requestId: number | any,
  payload: { mentor_notes: string; recommendations?: string }
) => {
  return await fetchApi(`/mentor-connect/requests/${resolveId(requestId)}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const fetchSessionDetail = async (requestId: number | any) => {
  return await fetchApi(`/mentor-connect/requests/${resolveId(requestId)}`);
};

export const fetchLearnerIntel = async (profileId: number) => {
  return await fetchApi(`/mentor-connect/learner-intel/${profileId}`);
};

export const fetchMentorLearners = async () => {
  return await fetchApi('/mentor-connect/learners');
};

export const sanityCheckRoadmap = async (payload: { 
  profile_id?: number; 
  modified_nodes?: any[];
  advice_text?: string;
  source_label?: string;
  target_role?: string;
}) => {
  return await fetchApi('/roadmap/sanity-check', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const fetchRelevantCourses = async (profileId: number, activeMilestone?: string) => {
  const url = activeMilestone 
    ? `/learner/courses?profile_id=${profileId}&active_milestone=${encodeURIComponent(activeMilestone)}`
    : `/learner/courses?profile_id=${profileId}`;
  return await fetchApi(url);
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

// --- AI Mock Interview & Resume API Types & Methods ---

export interface ResumeProjectClaim {
  name: string;
  technologies: string[];
  summary: string;
  claimed_responsibilities: string[];
}

export interface ResumeWorkExperienceClaim {
  company: string;
  role: string;
  duration?: string | null;
  highlights: string[];
}

export interface ResumeEducationClaim {
  institution: string;
  degree?: string | null;
  year?: string | null;
}

export interface ResumeParsedData {
  summary: string;
  technical_skills: string[];
  projects: ResumeProjectClaim[];
  work_experience: ResumeWorkExperienceClaim[];
  education: ResumeEducationClaim[];
  certifications: string[];
  claimed_roles: string[];
}

export interface ResumeRecord {
  id: number;
  profile_id: number;
  original_filename: string;
  content_type: string;
  raw_text: string;
  parsed_data?: ResumeParsedData | null;
  created_at: string;
  updated_at: string;
}

export interface MockInterviewTurnData {
  id: number;
  turn_index: number;
  category: string;
  question_text: string;
  expected_rubrics?: string[];
  learner_answer?: string | null;
  input_mode: string;
  answer_score?: number | null;
  evaluation_data?: any;
  detected_gap_data?: any;
  created_at: string;
}

export interface CanonicalSkillGap {
  canonical_skill_id?: string | null;
  canonical_skill_name: string;
  similarity: number;
  description: string;
  confidence: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  evidence?: string;
}

export interface ResumeVerificationItem {
  claim: string;
  status: 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED' | 'NOT_APPLICABLE';
  evidence: string;
}

export interface InterviewReportSummary {
  overall_score: number;
  technical_score: number;
  communication_score: number;
  resume_verification_score: number;
  confidence_score: number;
  verified_strengths: string[];
  development_areas: string[];
  canonical_skill_gaps: CanonicalSkillGap[];
  resume_verification_matrix: ResumeVerificationItem[];
  updated_bkt_skills?: Record<string, number>;
  path_version_id?: string | null;
  path_changed_nodes?: string[] | null;
  summary: string;
}

export interface MockInterviewSessionSummary {
  id: number;
  profile_id: number;
  target_role: string;
  interview_type: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  current_phase: string;
  current_turn_index: number;
  overall_score?: number | null;
  technical_score?: number | null;
  communication_score?: number | null;
  resume_verification_score?: number | null;
  confidence_score?: number | null;
  created_at: string;
  completed_at?: string | null;
}

export interface MockInterviewSessionDetail extends MockInterviewSessionSummary {
  resume_id?: number | null;
  context_snapshot?: any;
  feedback_summary?: InterviewReportSummary | null;
  turns: MockInterviewTurnData[];
}

export interface StartInterviewParams {
  target_role?: string;
  interview_type?: string;
  resume_id?: number | null;
}

export interface StartInterviewResponse {
  session_id: number;
  status: string;
  target_role: string;
  current_phase: string;
  turn_index: number;
  question: {
    id: number;
    turn_index: number;
    category: string;
    question_text: string;
    should_speak: boolean;
  };
}

export interface AnswerTurnResponse {
  session_id: number;
  status: string;
  current_phase?: string;
  turn_index: number;
  evaluation?: any;
  next_action: string;
  next_question?: {
    id: number;
    turn_index: number;
    category: string;
    question_text: string;
    should_speak: boolean;
  } | null;
  report_summary?: InterviewReportSummary | null;
  should_speak: boolean;
}

export const uploadResume = async (file: File): Promise<ResumeRecord> => {
  const formData = new FormData();
  formData.append('file', file);
  return await fetchApi('/interview/resume/upload', {
    method: 'POST',
    body: formData,
  });
};

export const getMyResume = async (): Promise<ResumeRecord> => {
  return await fetchApi('/interview/resume');
};

export const deleteMyResume = async (): Promise<void> => {
  return await fetchApi('/interview/resume', {
    method: 'DELETE',
  });
};

export const startInterviewSession = async (
  params: StartInterviewParams
): Promise<StartInterviewResponse> => {
  return await fetchApi('/interview/sessions', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export const listMyInterviewSessions = async (): Promise<MockInterviewSessionSummary[]> => {
  return await fetchApi('/interview/sessions');
};

export const getInterviewSession = async (
  sessionId: number
): Promise<MockInterviewSessionDetail> => {
  return await fetchApi(`/interview/sessions/${sessionId}`);
};

export const submitInterviewAnswer = async (
  sessionId: number,
  answer: string,
  inputMode: string = 'VOICE'
): Promise<AnswerTurnResponse> => {
  return await fetchApi(`/interview/sessions/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify({
      learner_answer: answer,
      input_mode: inputMode,
    }),
  });
};

export const completeInterviewSession = async (
  sessionId: number
): Promise<{ session_id: number; status: string; report: InterviewReportSummary }> => {
  return await fetchApi(`/interview/sessions/${sessionId}/complete`, {
    method: 'POST',
  });
};

export const getInterviewReport = async (
  sessionId: number
): Promise<InterviewReportSummary> => {
  return await fetchApi(`/interview/sessions/${sessionId}/report`);
};

export const transcribeAudio = async (audioBlob: Blob): Promise<{ text: string }> => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  return await fetchApi('/interview/transcribe-audio', {
    method: 'POST',
    body: formData,
  });
};

// =============================================================================
// ROADMAP.SH CANONICAL TOPOLOGY ADMIN CONTRACTS
// =============================================================================

export const getAvailableRoadmaps = async () => {
  return await fetchApi('/admin/roadmaps/available');
};

export const triggerRoadmapSync = async (slug: string, force = true) => {
  return await fetchApi(`/admin/roadmaps/sync/${slug}?force=${force}`, {
    method: 'POST'
  });
};

export const getRoadmapConflicts = async (resolved?: boolean) => {
  const query = resolved !== undefined ? `?resolved=${resolved}` : '';
  return await fetchApi(`/admin/roadmaps/conflicts${query}`);
};

export const resolveRoadmapConflict = async (conflictId: number) => {
  return await fetchApi(`/admin/roadmaps/conflicts/${conflictId}`, {
    method: 'PATCH'
  });
};

export const getRoadmapRoleMappings = async () => {
  return await fetchApi('/admin/roadmap-role-mapping');
};

export const updateRoadmapRoleMapping = async (payload: { role_id: string; roadmap_slugs: string[] }) => {
  return await fetchApi('/admin/roadmap-role-mapping', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
};

export const previewRoadmapSlug = async (slug: string) => {
  return await fetchApi(`/admin/roadmaps/${slug}/preview`);
};

// Learner-accessible roadmap graph (no admin required)
export const learnerRoadmapGraph = async (slug: string) => {
  return await fetchApi(`/learner/roadmaps/${slug}/graph`);
};

// ---------------------------------------------------------------------------
// Hackathon API Client Functions
// ---------------------------------------------------------------------------

export interface HackathonFilters {
  page?: number;
  page_size?: number;
  mode?: string;
  city?: string;
  status?: string;
  min_prize?: number;
  sort?: string;
  source?: string | string[];
}

export const getHackathons = async (filters: HackathonFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.page_size) params.append('page_size', filters.page_size.toString());
  if (filters.mode) params.append('mode', filters.mode);
  if (filters.city) params.append('city', filters.city);
  if (filters.status) params.append('status', filters.status);
  if (filters.min_prize) params.append('min_prize', filters.min_prize.toString());
  if (filters.sort) params.append('sort', filters.sort);
  if (filters.source) {
    if (Array.isArray(filters.source)) {
      filters.source.forEach(s => params.append('source', s));
    } else if (typeof filters.source === 'string' && (filters.source as string).trim().length > 0) {
      params.append('source', (filters.source as string).trim());
    }
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return await fetchApi(`/hackathons${queryString}`);
};

export const getHackathonDetail = async (id: string) => {
  return await fetchApi(`/hackathons/${id}`);
};

export const searchHackathons = async (q: string, page = 1, page_size = 20) => {
  const params = new URLSearchParams({ q, page: page.toString(), page_size: page_size.toString() });
  return await fetchApi(`/hackathons/search?${params.toString()}`);
};

export const getUpcomingHackathons = async (page = 1, page_size = 20) => {
  const params = new URLSearchParams({ page: page.toString(), page_size: page_size.toString() });
  return await fetchApi(`/hackathons/upcoming?${params.toString()}`);
};

export const getHackathonSources = async () => {
  return await fetchApi('/hackathons/sources');
};

export const triggerHackathonScrape = async (source: string, limit?: number) => {
  return await fetchApi('/hackathons/scrape', {
    method: 'POST',
    body: JSON.stringify({ source, limit: limit || 50 })
  });
};



// --- P2P Interview Endpoints ---

export const joinP2PQueue = async (payload: { user_id: string; topic: string }) => {
  return await fetchApi('/p2p/queue', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const checkP2PQueueStatus = async (userId: string) => {
  return await fetchApi(`/p2p/queue/status?user_id=${encodeURIComponent(userId)}`);
};

export const getP2PSession = async (sessionId: string | number) => {
  return await fetchApi(`/p2p/session/${sessionId}`);
};
