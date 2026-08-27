'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  BrainCircuit,
  Plus
} from 'lucide-react';
import {
  fetchMentorAssignedSessions,
  startMentorSession,
} from '../../../../api/client';
import JitsiMeetingModal from '../../../../components/mentor/JitsiMeetingModal';
import SessionScheduleDialog from '../../../../components/mentor/SessionScheduleDialog';
import CompleteSessionDialog from '../../../../components/mentor/CompleteSessionDialog';

export default function MentorSessionsPage() {
  const router = useRouter();
  const [sessionsTab, setSessionsTab] = useState<'upcoming' | 'completed'>('upcoming');

  const [mySessions, setMySessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Dialogs
  const [schedulingSession, setSchedulingSession] = useState<any | null>(null);
  const [completingSession, setCompletingSession] = useState<any | null>(null);
  const [activeMeetingSession, setActiveMeetingSession] = useState<any | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMentorAssignedSessions();
      setMySessions(data?.sessions || []);
    } catch (err) {
      console.error('Failed to load mentor sessions', err);
      setToastMsg({ type: 'error', message: 'Could not load your mentorship sessions.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleJoinMeeting = async (session: any) => {
    try {
      if (session.status === 'SCHEDULED') {
        await startMentorSession(session.id);
        loadSessions();
      }
    } catch (err) {
      console.warn('Could not mark session IN_PROGRESS', err);
    }
    setActiveMeetingSession(session);
  };

  const activeSessions = mySessions.filter(
    (s) => s.status === 'ACCEPTED' || s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS'
  );
  const completedSessions = mySessions.filter((s) => s.status === 'COMPLETED');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="text-indigo-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              1-on-1 Guidance
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Assigned Mentorship Sessions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your 1-on-1 video mentorship sessions, schedule meeting times, and log post-session takeaways
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/mentor')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white shadow-glow-indigo transition"
          >
            <Plus size={13} />
            <span>Accept New Requests</span>
          </button>
          <button
            onClick={loadSessions}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-slate-300 hover:text-white hover:border-indigo-500/50 transition"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg ${
            toastMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toastMsg.message}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-surface border border-indigo-500/30 rounded-2xl shadow-glass">
          <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} />
            <span>Active Sessions</span>
          </div>
          <div className="text-3xl font-black text-white mt-1">{activeSessions.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Assigned & in progress</div>
        </div>

        <div className="p-4 bg-surface border border-emerald-500/30 rounded-2xl shadow-glass">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            <span>Completed Mentorships</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-1">{completedSessions.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Logged with feedback & notes</div>
        </div>

        <div className="p-4 bg-surface border border-cyan-500/30 rounded-2xl shadow-glass flex flex-col justify-between">
          <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <BrainCircuit size={14} />
            <span>Learner 360° Diagnostic</span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Inspect learner graph positions and BKT mastery states before joining meetings.
          </p>
          <button
            onClick={() => router.push('/mentor/learner-intel')}
            className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
          >
            <span>Open Intelligence Center →</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border text-xs font-bold">
        <button
          onClick={() => setSessionsTab('upcoming')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            sessionsTab === 'upcoming'
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Calendar size={14} />
          <span>Upcoming & Active ({activeSessions.length})</span>
        </button>

        <button
          onClick={() => setSessionsTab('completed')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            sessionsTab === 'completed'
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle2 size={14} />
          <span>Completed History ({completedSessions.length})</span>
        </button>
      </div>

      {/* Tab 1: Upcoming & Active */}
      {sessionsTab === 'upcoming' && (
        <div>
          {isLoading ? (
            <div className="p-16 bg-surface border border-border rounded-3xl text-center">
              <Loader2 className="animate-spin text-indigo-400 mx-auto" size={32} />
              <p className="text-xs text-slate-400 mt-2">Loading your sessions...</p>
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="p-16 bg-surface border border-border rounded-3xl text-center space-y-3">
              <Calendar className="text-slate-500 mx-auto" size={36} />
              <h3 className="text-sm font-bold text-white">No Active Sessions</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You currently have no assigned sessions. Accept open student requests from the queue to start mentoring.
              </p>
              <button
                onClick={() => router.push('/mentor')}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white shadow-glow-indigo transition"
              >
                Browse Open Requests
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSessions.map((session) => {
                const isScheduled = session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS';

                return (
                  <div
                    key={session.id}
                    className="p-5 rounded-2xl bg-surface border border-border hover:border-slate-600 transition shadow-glass flex flex-col justify-between space-y-4"
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

                      {/* Title & Topic */}
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
                            <div className="text-[10px] text-slate-400">Meeting Time:</div>
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
                          className="px-3 py-1.5 rounded-xl bg-surface-secondary hover:bg-surface-tertiary border border-border text-xs font-semibold text-slate-300 transition"
                        >
                          {session.scheduled_at ? 'Reschedule' : 'Schedule Time'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {isScheduled && (
                          <button
                            onClick={() => handleJoinMeeting(session)}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition"
                          >
                            <Video size={13} />
                            <span>Join Meeting</span>
                          </button>
                        )}
                        <button
                          onClick={() => setCompletingSession(session)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition"
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

      {/* Tab 2: Completed History */}
      {sessionsTab === 'completed' && (
        <div>
          {completedSessions.length === 0 ? (
            <div className="p-16 bg-surface border border-border rounded-3xl text-center space-y-2">
              <FileText className="text-slate-500 mx-auto" size={36} />
              <h3 className="text-sm font-bold text-white">No Completed Sessions Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Completed mentorship logs and recommendations will appear here once sessions are finalized.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedSessions.map((session) => (
                <div key={session.id} className="p-5 rounded-2xl bg-surface border border-border space-y-3 shadow-glass">
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
            loadSessions();
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
            loadSessions();
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
            loadSessions();
            setToastMsg({ type: 'success', message: 'Session marked as COMPLETED and logged.' });
          }}
        />
      )}
    </div>
  );
}
