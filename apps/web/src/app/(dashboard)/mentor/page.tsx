'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import {
  fetchOpenMentorRequests,
  acceptMentorRequest,
  fetchMentorAssignedSessions,
  startMentorSession,
} from '../../../api/client';
import JitsiMeetingModal from '../../../components/mentor/JitsiMeetingModal';
import SessionScheduleDialog from '../../../components/mentor/SessionScheduleDialog';
import CompleteSessionDialog from '../../../components/mentor/CompleteSessionDialog';

export default function MentorConnectDashboard() {
  const [activeTab, setActiveTab] = useState<'open' | 'my_sessions' | 'history'>('open');

  // Open Requests State
  const [openRequests, setOpenRequests] = useState<any[]>([]);
  const [isLoadingOpen, setIsLoadingOpen] = useState(true);

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

  // 1. Load Open Requests
  const loadOpenRequests = useCallback(() => {
    setIsLoadingOpen(true);
    fetchOpenMentorRequests()
      .then((res: any) => {
        if (res && res.requests) {
          setOpenRequests(res.requests);
        } else {
          setOpenRequests([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load open mentor requests', err);
        setOpenRequests([]);
      })
      .finally(() => setIsLoadingOpen(false));
  }, []);

  // 2. Load My Assigned Sessions
  const loadMySessions = useCallback(() => {
    setIsLoadingMySessions(true);
    fetchMentorAssignedSessions()
      .then((res: any) => {
        if (res && res.sessions) {
          setMySessions(res.sessions);
        } else {
          setMySessions([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load mentor sessions', err);
        setMySessions([]);
      })
      .finally(() => setIsLoadingMySessions(false));
  }, []);

  useEffect(() => {
    loadOpenRequests();
    loadMySessions();
  }, [loadOpenRequests, loadMySessions]);

  // Toast Auto-dismiss
  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  // 3. Handle Atomic FCFS Acceptance
  const handleAcceptRequest = async (request: any) => {
    setAcceptingId(request.id);
    setToastMsg(null);

    try {
      await acceptMentorRequest(request.id);
      setToastMsg({
        type: 'success',
        message: `Successfully accepted session for ${request.learner_name}! Please schedule a meeting time.`,
      });
      loadOpenRequests();
      loadMySessions();
      setActiveTab('my_sessions');
    } catch (err: any) {
      console.error('Failed to accept request', err);
      if (err?.message?.includes('409') || err?.message?.includes('another mentor')) {
        setToastMsg({
          type: 'error',
          message: 'This request was just accepted by another mentor.',
        });
      } else {
        setToastMsg({
          type: 'error',
          message: err?.message || 'Could not accept session request.',
        });
      }
      // Auto-refresh feed to reflect updated state
      loadOpenRequests();
    } finally {
      setAcceptingId(null);
    }
  };

  // 4. Handle Join Meeting
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
            Human 1-on-1 guidance control center — review learner requests, schedule video sessions, and record takeaways
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadOpenRequests();
              loadMySessions();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-slate-300 hover:text-white hover:border-brand-500/50 transition-all"
            title="Refresh"
          >
            <RefreshCw size={13} className={isLoadingOpen || isLoadingMySessions ? 'animate-spin' : ''} />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-glass">
          <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Inbox size={14} />
            <span>Open Learner Requests</span>
          </div>
          <div className="text-3xl font-black text-white mt-1">
            {openRequests.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Available for first-come acceptance</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-indigo-500/30 shadow-glass">
          <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} />
            <span>My Upcoming Sessions</span>
          </div>
          <div className="text-3xl font-black text-indigo-400 mt-1">
            {activeSessions.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Accepted & scheduled meetings</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-emerald-500/30 shadow-glass">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            <span>Completed Mentorships</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-1">
            {completedSessions.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Sessions logged with takeaways</div>
        </div>
      </div>

      {/* Control Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { id: 'open', label: `📥 Open Requests (${openRequests.length})` },
          { id: 'my_sessions', label: `📅 My Scheduled Sessions (${activeSessions.length})` },
          { id: 'history', label: `✓ Completed History (${completedSessions.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-glow-indigo'
                : 'bg-surface border border-border text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Open Learner Requests */}
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

                  {/* Accept Action */}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      Requested {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <button
                      onClick={() => handleAcceptRequest(req)}
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
                      <button
                        onClick={() => setSchedulingSession(session)}
                        className="px-3.5 py-1.5 rounded-xl bg-surface-secondary hover:bg-surface-tertiary border border-border text-xs font-semibold text-slate-300 transition-colors"
                      >
                        {session.scheduled_at ? 'Reschedule' : 'Schedule Time'}
                      </button>

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

      {/* TAB 3: Completed Session History */}
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
              <CheckCircle2 className="text-slate-500 mx-auto" size={36} />
              <h3 className="text-sm font-bold text-white">No Completed Sessions Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Completed mentorship sessions and logged recommendations will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-5 rounded-2xl bg-surface border border-border shadow-glass space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-white text-sm">{session.learner_name}</div>
                      <div className="text-[11px] text-slate-400">{session.title}</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      Completed
                    </span>
                  </div>

                  {session.mentor_notes && (
                    <div className="p-3 rounded-xl bg-surface-secondary/70 border border-border text-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <FileText size={11} />
                        <span>Notes Logged</span>
                      </div>
                      <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                        {session.mentor_notes}
                      </p>
                    </div>
                  )}

                  {session.recommendations && (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                      <div className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
                        <Lightbulb size={11} />
                        <span>Recommendations</span>
                      </div>
                      <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                        {session.recommendations}
                      </p>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 pt-1 text-right">
                    Completed on {new Date(session.completed_at || session.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialog Modals */}
      <SessionScheduleDialog
        isOpen={!!schedulingSession}
        onClose={() => setSchedulingSession(null)}
        session={schedulingSession}
        onSuccess={() => {
          loadMySessions();
          setToastMsg({ type: 'success', message: 'Session scheduled successfully with video room provisioned.' });
        }}
      />

      <CompleteSessionDialog
        isOpen={!!completingSession}
        onClose={() => setCompletingSession(null)}
        session={completingSession}
        onSuccess={() => {
          loadMySessions();
          setToastMsg({ type: 'success', message: 'Session marked as completed and recommendations recorded.' });
        }}
      />

      {activeMeetingSession && (
        <JitsiMeetingModal
          isOpen={!!activeMeetingSession}
          onClose={() => setActiveMeetingSession(null)}
          roomName={activeMeetingSession.meeting_room_id || `aven-connect-${activeMeetingSession.id}`}
          sessionTitle={activeMeetingSession.title}
          userName={activeMeetingSession.mentor_name || 'Mentor'}
          userRole="mentor"
          durationMinutes={activeMeetingSession.duration_minutes}
        />
      )}
    </div>
  );
}
