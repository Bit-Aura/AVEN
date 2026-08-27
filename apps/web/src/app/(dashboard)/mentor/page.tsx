'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  Video,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Inbox,
  UserCheck,
  Send,
  XCircle,
  BrainCircuit,
  Network,
  Target,
  Compass,
  Award,
  TrendingUp,
  Check,
  X,
  ChevronRight,
  Layers,
  Activity,
  ArrowUpRight,
  BookOpen,
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';
import {
  fetchOpenMentorRequests,
  acceptMentorRequest,
  fetchMentorAssignedSessions,
  startMentorSession,
  fetchLearnerIntel,
} from '../../../api/client';
import JitsiMeetingModal from '../../../components/mentor/JitsiMeetingModal';
import SessionScheduleDialog from '../../../components/mentor/SessionScheduleDialog';
import CompleteSessionDialog from '../../../components/mentor/CompleteSessionDialog';

function MentorConnectDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'open' | 'my_sessions' | 'history' | 'triage'>(
    (tabParam === 'my_sessions' || tabParam === 'open' || tabParam === 'history' || tabParam === 'triage')
      ? tabParam
      : 'open'
  );

  useEffect(() => {
    if (tabParam === 'my_sessions' || tabParam === 'open' || tabParam === 'history' || tabParam === 'triage') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Open Requests State
  const [openRequests, setOpenRequests] = useState<any[]>([]);
  const [isLoadingOpen, setIsLoadingOpen] = useState(true);

  // Triage Queue State
  const [triageQueue, setTriageQueue] = useState<any[]>([]);
  const [isLoadingTriage, setIsLoadingTriage] = useState(true);

  // My Sessions State
  const [mySessions, setMySessions] = useState<any[]>([]);
  const [isLoadingMySessions, setIsLoadingMySessions] = useState(true);

  // Acceptance state & Inline Notification Toast
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modal Dialogs
  const [schedulingSession, setSchedulingSession] = useState<any | null>(null);
  const [completingSession, setCompletingSession] = useState<any | null>(null);
  const [activeMeetingSession, setActiveMeetingSession] = useState<any | null>(null);

  // Learner 360° Knowledge & Graph Position Inspector State
  const [inspectingProfileId, setInspectingProfileId] = useState<number | null>(null);
  const [inspectingContextRequest, setInspectingContextRequest] = useState<any | null>(null);
  const [learnerIntel, setLearnerIntel] = useState<any | null>(null);
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);
  const [intelTab, setIntelTab] = useState<'graph' | 'brief' | 'activity'>('graph');

  // 1. Fetch Open Requests
  const loadOpenRequests = useCallback(async () => {
    setIsLoadingOpen(true);
    try {
      const data = await fetchOpenMentorRequests();
      setOpenRequests(data && data.requests ? data.requests : []);
    } catch (err: any) {
      console.error('Failed to load open mentor requests', err);
      setToastMsg({ type: 'error', message: 'Could not load open requests queue.' });
    } finally {
      setIsLoadingOpen(false);
    }
  }, []);

  // 2. Fetch My Assigned Sessions
  const loadMySessions = useCallback(async () => {
    setIsLoadingMySessions(true);
    try {
      const data = await fetchMentorAssignedSessions();
      setMySessions(data && data.sessions ? data.sessions : []);
    } catch (err: any) {
      console.error('Failed to load mentor assigned sessions', err);
    } finally {
      setIsLoadingMySessions(false);
    }
  }, []);

  // 3. Fetch Triage Queue
  const loadTriageQueue = useCallback(async () => {
    setIsLoadingTriage(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/placement/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        setTriageQueue(data && data.queue ? data.queue : []);
      }
    } catch (err) {
      console.error('Failed to load triage queue', err);
    } finally {
      setIsLoadingTriage(false);
    }
  }, []);

  useEffect(() => {
    loadOpenRequests();
    loadMySessions();
    loadTriageQueue();
  }, [loadOpenRequests, loadMySessions, loadTriageQueue]);

  // Toast Auto-dismiss
  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  // Open Learner 360° Intel Modal
  const openLearner360Modal = async (profileId: number, contextReq?: any) => {
    const pId = profileId || contextReq?.profile_id || 1;
    setInspectingProfileId(pId);
    setInspectingContextRequest(contextReq || null);
    setIntelTab('graph');
    setIsLoadingIntel(true);
    try {
      const intel = await fetchLearnerIntel(pId);
      setLearnerIntel(intel);
    } catch (err) {
      console.error('Failed to load learner 360 intel', err);
      setToastMsg({ type: 'error', message: 'Could not load learner 360° profile intelligence.' });
    } finally {
      setIsLoadingIntel(false);
    }
  };

  // 4. Handle Session Accept
  const handleAcceptRequest = async (target: any) => {
    const requestId = typeof target === 'object' && target !== null ? target.id : target;
    if (!requestId) return;
    setAcceptingId(requestId);
    try {
      await acceptMentorRequest(Number(requestId));
      setToastMsg({
        type: 'success',
        message: 'Request accepted! You can now schedule the session.',
      });
      // Auto-refresh feeds
      loadOpenRequests();
      loadMySessions();
      if (inspectingContextRequest && inspectingContextRequest.id === requestId) {
        setInspectingProfileId(null);
      }
    } catch (err: any) {
      if (err?.message?.includes('already accepted')) {
        setToastMsg({
          type: 'info',
          message: 'Another mentor already picked this up.',
        });
      } else {
        setToastMsg({
          type: 'error',
          message: err?.message || 'Could not accept session request.',
        });
      }
      loadOpenRequests();
    } finally {
      setAcceptingId(null);
    }
  };

  // 5. Handle Join Meeting
  const handleJoinMeeting = async (session: any) => {
    try {
      if (session.status === 'SCHEDULED') {
        await startMentorSession(session.id);
        loadMySessions();
      }
    } catch (err) {
      console.warn('Could not mark session IN_PROGRESS', err);
    }
    setActiveMeetingSession(session);
  };

  // Filter My Sessions by Tab
  const activeSessions = mySessions.filter((s) => s.status === 'ACCEPTED' || s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS');
  const completedSessions = mySessions.filter((s) => s.status === 'COMPLETED');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="text-brand-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Mentor Operations
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Mentor Connect
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Human 1-on-1 guidance control center — review learner requests, inspect complete graph progress, and schedule targeted video sessions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadOpenRequests();
              loadTriageQueue();
              loadMySessions();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-slate-300 hover:text-white hover:border-brand-500/50 transition-all"
            title="Refresh"
          >
            <RefreshCw size={13} className={isLoadingOpen || isLoadingMySessions || isLoadingTriage ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
          <div className="flex items-center gap-2 text-xs bg-surface border border-border px-3.5 py-2 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">Mentor Queue Active</span>
          </div>
        </div>
      </div>

      {/* Inline Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : toastMsg.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMsg.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <AlertTriangle size={16} className="shrink-0" />
            )}
            <span>{toastMsg.message}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="p-1 rounded-lg hover:bg-black/20 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metric Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-amber-500/30 shadow-glass">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle size={14} />
            <span>Triage Candidates</span>
          </div>
          <div className="text-3xl font-black text-amber-400 mt-1">
            {triageQueue.filter(t => t.breakthrough_zone).length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Learners in breakthrough zone</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-cyan-500/30 shadow-glass">
          <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Inbox size={14} />
            <span>Open Learner Requests</span>
          </div>
          <div className="text-3xl font-black text-cyan-400 mt-1">{openRequests.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Available for first-come acceptance</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-indigo-500/30 shadow-glass">
          <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} />
            <span>My Upcoming Sessions</span>
          </div>
          <div className="text-3xl font-black text-indigo-400 mt-1">{activeSessions.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Accepted & scheduled meetings</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-emerald-500/30 shadow-glass">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            <span>Completed Mentorships</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-1">{completedSessions.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Sessions logged with takeaways</div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border text-xs font-bold">
        <button
          onClick={() => setActiveTab('triage')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'triage'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Triage Queue</span>
          {triageQueue.filter(t => t.breakthrough_zone).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
              {triageQueue.filter(t => t.breakthrough_zone).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('open')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'open'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Inbox size={14} />
          <span>Open Requests ({openRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('my_sessions')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'my_sessions'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar size={14} />
          <span>My Scheduled Sessions ({activeSessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 size={14} />
          <span>Completed History ({completedSessions.length})</span>
        </button>
      </div>

      {/* TAB 1: Open Requests */}
      {activeTab === 'open' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="text-cyan-400" size={16} />
              <span>Learners Awaiting Mentor Assignment</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              First-Come-First-Served (FCFS)
            </span>
          </div>

          {isLoadingOpen ? (
            <div className="p-16 text-center bg-surface border border-border rounded-2xl">
              <Loader2 className="animate-spin text-brand-400 mx-auto" size={32} />
              <p className="text-xs text-slate-400 mt-2">Loading open requests queue...</p>
            </div>
          ) : openRequests.length === 0 ? (
            <div className="p-16 text-center bg-surface border border-border rounded-2xl space-y-2">
              <CheckCircle2 className="text-emerald-400 mx-auto" size={36} />
              <h3 className="text-sm font-bold text-white">All Caught Up!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                There are currently no open mentor requests. New learner escalation requests will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-surface border border-border hover:border-brand-500/40 transition-all shadow-glass flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header: Learner & Duration */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-white text-sm">{req.learner_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {req.target_role || 'Software Engineering Track'} • {req.learner_email}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-surface-secondary text-slate-300 font-mono text-[11px] border border-border flex items-center gap-1">
                        <Clock size={11} className="text-indigo-400" />
                        <span>{req.requested_duration_minutes}m</span>
                      </span>
                    </div>

                    {/* Skill Readiness Badge */}
                    {req.skill_id && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-secondary/70 border border-border text-xs">
                        <span className="font-mono text-slate-300 text-[11px]">{req.skill_id}</span>
                        {req.skill_readiness_pct !== null && (
                          <span
                            className={`ml-auto font-bold text-[11px] ${
                              req.skill_readiness_pct >= 80
                                ? 'text-emerald-400'
                                : req.skill_readiness_pct >= 60
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            Readiness: {req.skill_readiness_pct}%
                          </span>
                        )}
                      </div>
                    )}

                    {/* Request Topic & Reason */}
                    <div>
                      <h3 className="text-sm font-bold text-white">{req.title}</h3>
                      <div className="text-[11px] text-indigo-300 font-medium mt-1">
                        Reason: {req.reason}
                      </div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-surface-secondary/40 p-3 rounded-xl border border-border/40">
                        {req.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <button
                      onClick={() => router.push(`/mentor/learner-intel?profile_id=${req.profile_id || 1}`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-secondary hover:bg-slate-700 text-indigo-300 hover:text-white border border-border text-xs font-semibold transition"
                      title="Inspect complete learner goal, lagging skills & graph position"
                    >
                      <BrainCircuit size={13} className="text-indigo-400" />
                      <span>Learner 360° Intel</span>
                    </button>

                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      disabled={acceptingId === req.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs shadow-glow-indigo transition-all"
                    >
                      {acceptingId === req.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <UserCheck size={13} />
                      )}
                      <span>Accept Request</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: My Scheduled Sessions */}
      {activeTab === 'my_sessions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="text-indigo-400" size={16} />
              <span>Assigned Mentorship Sessions</span>
            </h2>
          </div>

          {isLoadingMySessions ? (
            <div className="p-16 text-center bg-surface border border-border rounded-2xl">
              <Loader2 className="animate-spin text-brand-400 mx-auto" size={32} />
              <p className="text-xs text-slate-400 mt-2">Loading your sessions...</p>
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="p-16 text-center bg-surface border border-border rounded-2xl space-y-2">
              <Calendar className="text-slate-500 mx-auto" size={36} />
              <h3 className="text-sm font-bold text-white">No Active Sessions</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You currently have no assigned sessions. Accept open requests from the Open Requests tab to start mentoring.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSessions.map((session) => {
                const isScheduled = session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS';
                const isAcceptedNeedSchedule = session.status === 'ACCEPTED' && !session.scheduled_at;

                return (
                  <div
                    key={session.id}
                    className="p-5 rounded-2xl bg-surface border border-border hover:border-border/80 transition-all shadow-glass flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white text-sm">{session.learner_name}</div>
                          <div className="text-[11px] text-slate-400">{session.learner_email}</div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isScheduled
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-sm font-bold text-white">{session.title}</h3>
                        {session.skill_id && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-surface-secondary text-slate-300 text-[10px] font-mono border border-border">
                            {session.skill_id}
                          </span>
                        )}
                        <p className="text-xs text-slate-300 mt-2 leading-relaxed line-clamp-2">
                          {session.description}
                        </p>
                      </div>

                      {/* Schedule info */}
                      {session.scheduled_at ? (
                        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-xs">
                          <div>
                            <div className="text-[10px] text-slate-400">Scheduled Time:</div>
                            <div className="font-bold text-white font-mono">
                              {new Date(session.scheduled_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400">Duration:</div>
                            <div className="font-bold text-slate-200">{session.duration_minutes} mins</div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-medium">
                          ⚠️ Meeting date/time needs to be scheduled.
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/mentor/learner-intel?profile_id=${session.profile_id || 1}`)}
                          className="px-3 py-1.5 rounded-xl bg-surface-secondary hover:bg-slate-700 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 border border-border transition"
                        >
                          <BrainCircuit size={13} />
                          <span>360° Intel</span>
                        </button>

                        <button
                          onClick={() => setSchedulingSession(session)}
                          className="px-3 py-1.5 rounded-xl bg-surface-secondary hover:bg-surface-tertiary border border-border text-xs font-semibold text-slate-300 transition-colors"
                        >
                          {session.scheduled_at ? 'Reschedule' : 'Schedule Time'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isScheduled && (
                          <button
                            onClick={() => handleJoinMeeting(session)}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
                          >
                            <Video size={13} />
                            <span>Join Meeting</span>
                          </button>
                        )}
                        <button
                          onClick={() => setCompletingSession(session)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
                        >
                          <CheckCircle2 size={13} />
                          <span>Complete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Completed History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400" size={16} />
              <span>Mentorship History & Takeaways</span>
            </h2>
          </div>

          {completedSessions.length === 0 ? (
            <div className="p-16 text-center bg-surface border border-border rounded-2xl space-y-2">
              <FileText className="text-slate-500 mx-auto" size={36} />
              <h3 className="text-sm font-bold text-white">No Completed Sessions Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Completed 1-on-1 mentorship logs, mentor notes, and guidance history will be archived here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedSessions.map((session) => (
                <div key={session.id} className="p-5 rounded-2xl bg-surface border border-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-white">{session.title}</div>
                      <div className="text-xs text-slate-400">
                        Learner: {session.learner_name} ({session.learner_email})
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase border border-emerald-500/30">
                      Completed
                    </span>
                  </div>

                  {session.mentor_notes && (
                    <div className="p-3 bg-surface-secondary/50 rounded-xl text-xs space-y-1 border border-border">
                      <div className="font-bold text-slate-300">Mentor Takeaways:</div>
                      <p className="text-slate-300">{session.mentor_notes}</p>
                    </div>
                  )}

                  {session.recommendations && (
                    <div className="p-3 bg-brand-500/5 rounded-xl text-xs space-y-1 border border-brand-500/20">
                      <div className="font-bold text-brand-300">Actionable Roadmap Recommendations:</div>
                      <p className="text-brand-200">{session.recommendations}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Triage Queue */}
      {activeTab === 'triage' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="text-amber-400" size={16} />
              <span>Algorithmic Mentor Triage Queue (90th Percentile Breakthrough Zone)</span>
            </h2>
          </div>

          {isLoadingTriage ? (
            <div className="p-16 text-center bg-surface border border-border rounded-2xl">
              <Loader2 className="animate-spin text-amber-400 mx-auto" size={32} />
              <p className="text-xs text-slate-400 mt-2">Running triage ranking algorithm...</p>
            </div>
          ) : triageQueue.length === 0 ? (
            <div className="p-16 text-center bg-surface border border-border rounded-2xl">
              <CheckCircle2 className="text-emerald-400 mx-auto" size={36} />
              <h3 className="text-sm font-bold text-white mt-2">No High Friction Learners</h3>
              <p className="text-xs text-slate-400 mt-1">All active learners are progressing smoothly.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {triageQueue.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    item.breakthrough_zone
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-glow-indigo'
                      : 'bg-surface border-border'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{item.display_label}</span>
                      {item.breakthrough_zone && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black uppercase">
                          Breakthrough Zone (High Leverage)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300">{item.recommended_action}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
                      <span>Readiness: {item.readiness_pct}%</span>
                      <span>•</span>
                      <span>Gap Skills: {item.gap_skills_count}</span>
                      <span>•</span>
                      <span>Triage Score: {item.triage_score}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/mentor/learner-intel?profile_id=${item.profile_id}`)}
                    className="px-4 py-2 rounded-xl bg-surface-secondary hover:bg-slate-700 text-indigo-300 font-bold text-xs border border-border transition shrink-0 flex items-center gap-1.5"
                  >
                    <BrainCircuit size={14} />
                    <span>View Graph Intel</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEARNER 360° KNOWLEDGE & GRAPH POSITION INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {inspectingProfileId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
            {/* Modal Header Bar */}
            <div className="p-6 bg-slate-950/90 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BrainCircuit className="text-indigo-400" size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                    Learner 360° Diagnostic & Graph Position
                  </span>
                </div>
                {learnerIntel ? (
                  <div>
                    <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                      <span>{learnerIntel.name}</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {learnerIntel.target_role}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {learnerIntel.email} • Study Pace: {learnerIntel.weekly_hours} hrs/week
                    </p>
                  </div>
                ) : (
                  <div className="h-6 w-48 bg-slate-800 animate-pulse rounded" />
                )}
              </div>

              <button
                onClick={() => setInspectingProfileId(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Body */}
            {isLoadingIntel || !learnerIntel ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="animate-spin text-indigo-500" size={36} />
                <p className="text-xs text-slate-400">Querying ground-truth skill graph & BKT mastery state...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Hero Metrics & Goal Progress Bar */}
                <div className="p-6 bg-slate-950/40 border-b border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                  <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Goal Readiness
                    </div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-2xl font-black text-white">{learnerIntel.overall_readiness_pct}%</span>
                      <span className="text-[10px] text-indigo-400 font-bold">Target: 70%+</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${learnerIntel.overall_readiness_pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Current Frontier Node
                    </div>
                    <div className="text-sm font-extrabold text-indigo-300 truncate">
                      {learnerIntel.current_frontier_skill
                        ? learnerIntel.current_frontier_skill.replace('_', ' ').toUpperCase()
                        : 'Advancing Smoothly'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Active bottleneck in graph</div>
                  </div>

                  <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Graph Mastery Split
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="text-emerald-400">{learnerIntel.mastered_count} Done</span>
                      <span>•</span>
                      <span className="text-amber-400">{learnerIntel.in_progress_count} In Progress</span>
                    </div>
                    <div className="text-[10px] text-rose-400 mt-1">{learnerIntel.lagging_count} Blocked / Lagging</div>
                  </div>

                  <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Active Request Context
                    </div>
                    <div className="text-xs font-bold text-white truncate">
                      {inspectingContextRequest ? inspectingContextRequest.title : 'General 1-on-1 Guidance'}
                    </div>
                    <div className="text-[10px] text-indigo-400 mt-1">
                      Reason: {inspectingContextRequest ? inspectingContextRequest.reason : 'Diagnostic review'}
                    </div>
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-950/20 text-xs font-bold px-6 shrink-0">
                  <button
                    onClick={() => setIntelTab('graph')}
                    className={`py-3.5 px-4 flex items-center gap-2 border-b-2 transition ${
                      intelTab === 'graph'
                        ? 'border-indigo-500 text-indigo-300'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Network size={14} />
                    <span>Skill Graph Position ({learnerIntel.graph_nodes.length} Nodes)</span>
                  </button>

                  <button
                    onClick={() => setIntelTab('brief')}
                    className={`py-3.5 px-4 flex items-center gap-2 border-b-2 transition ${
                      intelTab === 'brief'
                        ? 'border-indigo-500 text-indigo-300'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Lightbulb size={14} />
                    <span>Mentor Action Brief & Talking Points</span>
                  </button>

                  <button
                    onClick={() => setIntelTab('activity')}
                    className={`py-3.5 px-4 flex items-center gap-2 border-b-2 transition ${
                      intelTab === 'activity'
                        ? 'border-indigo-500 text-indigo-300'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Activity size={14} />
                    <span>Recent Diagnostic & Assessment Activity ({learnerIntel.recent_activities.length})</span>
                  </button>
                </div>

                {/* Tab 1: Skill Graph Position & Matrix */}
                {intelTab === 'graph' && (
                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl text-xs text-indigo-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Compass size={16} className="text-indigo-400 shrink-0" />
                        <span>
                          <strong>Ground-Truth Skill Graph:</strong> Evaluated using Bayesian Knowledge Tracing (BKT) probability of mastery $P(L)$.
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-bold">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" /> Mastered (70%+)
                        </span>
                        <span className="flex items-center gap-1 text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-400" /> In Progress (30-69%)
                        </span>
                        <span className="flex items-center gap-1 text-rose-400">
                          <span className="w-2 h-2 rounded-full bg-rose-400" /> Lagging / Stuck (&lt;30%)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {learnerIntel.graph_nodes.map((node: any, nIdx: number) => {
                        const isMastered = node.status === 'MASTERED';
                        const isLagging = node.status === 'LAGGING';
                        const isInProgress = node.status === 'IN_PROGRESS';

                        return (
                          <div
                            key={nIdx}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                              node.is_frontier
                                ? 'bg-indigo-950/40 border-indigo-400 shadow-glow-indigo'
                                : isMastered
                                ? 'bg-emerald-950/10 border-emerald-500/30'
                                : isLagging
                                ? 'bg-rose-950/10 border-rose-500/30'
                                : isInProgress
                                ? 'bg-amber-950/10 border-amber-500/30'
                                : 'bg-slate-950/60 border-slate-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded">
                                  {node.id}
                                </span>
                                <span
                                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                    isMastered
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : isLagging
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : isInProgress
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {node.status}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-white">{node.name}</h4>
                              <p className="text-[11px] text-slate-400 leading-snug mt-1 line-clamp-2">
                                {node.description || 'Core requirement for target engineering track.'}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                              <span className="text-[10px] text-slate-500">Mastery Score:</span>
                              <span className={`font-mono font-bold ${
                                isMastered ? 'text-emerald-400' : isLagging ? 'text-rose-400' : 'text-slate-300'
                              }`}>
                                {node.readiness_score}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab 2: Mentor Action Brief & Talking Points */}
                {intelTab === 'brief' && (
                  <div className="flex-1 p-6 overflow-y-auto space-y-5">
                    {/* Executive Summary Card */}
                    <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Sparkles size={14} />
                        <span>AI Synthesized Learner Overview</span>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed font-medium">
                        {learnerIntel.mentor_brief.executive_summary}
                      </p>
                    </div>

                    {/* Current Blocker & Root Cause */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                          <AlertTriangle size={14} />
                          <span>Identified Learning Blocker</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {learnerIntel.mentor_brief.current_blocker}
                        </p>
                      </div>

                      <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <HelpCircle size={14} />
                          <span>Root Cause Analysis</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {learnerIntel.mentor_brief.root_cause_analysis}
                        </p>
                      </div>
                    </div>

                    {/* Suggested Talking Points for Mentor */}
                    <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Lightbulb size={14} className="text-amber-400" />
                        <span>Recommended 1-on-1 Coaching Talking Points</span>
                      </div>
                      <div className="space-y-2">
                        {learnerIntel.mentor_brief.suggested_talking_points.map((tp: string, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-2.5 text-xs">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-slate-300 leading-relaxed">{tp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Recent Activity & Diagnostic Log */}
                {intelTab === 'activity' && (
                  <div className="flex-1 p-6 overflow-y-auto space-y-3">
                    {learnerIntel.recent_activities.length === 0 ? (
                      <div className="py-16 text-center text-slate-500 text-xs">
                        No recent assessment activity logged for this learner.
                      </div>
                    ) : (
                      learnerIntel.recent_activities.map((act: any, aIdx: number) => (
                        <div key={aIdx} className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono bg-slate-800 text-indigo-300">
                                {act.activity_type}
                              </span>
                              <span className="font-bold text-white text-xs">{act.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-400">{act.detail}</p>
                          </div>

                          <div className="text-right shrink-0">
                            {act.score !== null && (
                              <div className="text-sm font-extrabold text-white font-mono">{act.score}%</div>
                            )}
                            <span className={`text-[10px] font-bold uppercase ${
                              act.status === 'PASSED' ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {act.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Footer Action Bar */}
                <div className="p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
                  <span className="text-xs text-slate-400">
                    Inspecting Profile ID: <strong className="text-white font-mono">#{learnerIntel.profile_id}</strong>
                  </span>

                  <div className="flex items-center gap-3">
                    {inspectingContextRequest && inspectingContextRequest.status === 'OPEN' && (
                      <button
                        onClick={() => handleAcceptRequest(inspectingContextRequest.id)}
                        disabled={acceptingId === inspectingContextRequest.id}
                        className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs shadow-glow-indigo transition flex items-center gap-2"
                      >
                        <UserCheck size={14} />
                        <span>Accept Request Now</span>
                      </button>
                    )}

                    <button
                      onClick={() => setInspectingProfileId(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
                    >
                      Close Inspector
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meeting Modal & Dialogs */}
      {activeMeetingSession && (
        <JitsiMeetingModal
          isOpen={!!activeMeetingSession}
          roomName={activeMeetingSession.meeting_room_id || `aven-mentor-session-${activeMeetingSession.id}`}
          sessionTitle={activeMeetingSession.title || '1-on-1 Mentorship'}
          userName="Mentor"
          userRole="mentor"
          durationMinutes={activeMeetingSession.duration_minutes || 30}
          onClose={() => {
            setActiveMeetingSession(null);
            loadMySessions();
          }}
        />
      )}

      {schedulingSession && (
        <SessionScheduleDialog
          isOpen={!!schedulingSession}
          session={schedulingSession}
          onClose={() => setSchedulingSession(null)}
          onSuccess={() => {
            setSchedulingSession(null);
            loadMySessions();
            setToastMsg({ type: 'success', message: 'Session scheduled successfully!' });
          }}
        />
      )}

      {completingSession && (
        <CompleteSessionDialog
          isOpen={!!completingSession}
          session={completingSession}
          onClose={() => setCompletingSession(null)}
          onSuccess={() => {
            setCompletingSession(null);
            loadMySessions();
            setToastMsg({ type: 'success', message: 'Session marked as COMPLETED and logged.' });
          }}
        />
      )}
    </div>
  );
}

export default function MentorConnectDashboard() {
  return (
    <Suspense fallback={
      <div className="p-20 text-center">
        <Loader2 className="animate-spin text-brand-400 mx-auto" size={32} />
      </div>
    }>
      <MentorConnectDashboardContent />
    </Suspense>
  );
}
