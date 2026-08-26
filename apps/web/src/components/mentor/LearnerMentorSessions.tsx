'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Video,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  RefreshCw,
  FileText,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import { fetchLearnerSessionRequests, cancelSessionRequest, startMentorSession } from '../../api/client';
import RequestMentorModal from './RequestMentorModal';
import JitsiMeetingModal from './JitsiMeetingModal';

export default function LearnerMentorSessions() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal States
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [activeMeetingSession, setActiveMeetingSession] = useState<any | null>(null);

  const loadRequests = useCallback(() => {
    setIsLoading(true);
    fetchLearnerSessionRequests()
      .then((res: any) => {
        if (res && res.requests) {
          setRequests(res.requests);
        } else {
          setRequests([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load learner mentor requests', err);
        setErrorMsg('Could not load mentor sessions.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleCancel = async (requestId: number) => {
    try {
      await cancelSessionRequest(requestId);
      loadRequests();
    } catch (err: any) {
      console.error('Failed to cancel request', err);
      alert(`Could not cancel request: ${err?.message || 'Error occurred.'}`);
    }
  };

  const handleJoinMeeting = (session: any) => {
    setActiveMeetingSession(session);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-border shadow-glass">
        <div>
          <div className="flex items-center gap-2">
            <Users className="text-brand-400" size={18} />
            <h2 className="text-base font-bold text-white tracking-tight">
              My 1-on-1 Mentor Sessions
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Request expert guidance, join live Jitsi video meetings, and review post-session takeaways
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRequests}
            disabled={isLoading}
            className="p-2 rounded-xl bg-surface-secondary border border-border text-slate-400 hover:text-white transition-colors"
            title="Refresh Sessions"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
          >
            <Plus size={14} />
            <span>Request Mentor Session</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sessions Grid / List */}
      {isLoading ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl">
          <Loader2 className="animate-spin text-brand-400 mx-auto" size={28} />
          <p className="text-xs text-slate-400 mt-2">Loading your mentor sessions...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-2xl space-y-3">
          <Users className="text-slate-500 mx-auto" size={32} />
          <div>
            <h3 className="text-sm font-bold text-white">No Mentor Sessions Requested Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Whenever you feel stuck on a coding challenge, architecture problem, or interview topic, request a 1-on-1 human mentor session.
            </p>
          </div>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all mt-2"
          >
            <Plus size={14} />
            <span>Request Your First Session</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((session) => {
            const isScheduled = session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS';
            const isCompleted = session.status === 'COMPLETED';
            const isOpen = session.status === 'OPEN';
            const isAccepted = session.status === 'ACCEPTED';
            const isCancelled = session.status === 'CANCELLED';

            return (
              <div
                key={session.id}
                className="p-5 rounded-2xl bg-surface border border-border hover:border-border/80 transition-all shadow-glass flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Status Badge & Duration */}
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : isScheduled
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse'
                          : isAccepted
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : isOpen
                          ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-700/30 text-slate-400 border border-slate-700/50'
                      }`}
                    >
                      {session.status}
                    </span>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Clock size={12} className="text-slate-400" />
                      <span>{session.duration_minutes} mins</span>
                    </div>
                  </div>

                  {/* Title & Reason */}
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-white line-clamp-1">{session.title}</h3>
                    {session.skill_id && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-surface-secondary text-slate-300 text-[10px] font-mono border border-border">
                        Skill: {session.skill_id}
                      </span>
                    )}
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed line-clamp-2">
                      {session.description}
                    </p>
                  </div>

                  {/* Mentor Assigned Info */}
                  {session.mentor_name && (
                    <div className="mt-3 p-2.5 rounded-xl bg-surface-secondary/70 border border-border flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Assigned Mentor:</div>
                        <div className="font-semibold text-white">{session.mentor_name}</div>
                      </div>
                      {session.scheduled_at && (
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">Scheduled:</div>
                          <div className="font-semibold text-indigo-300 font-mono text-[11px]">
                            {new Date(session.scheduled_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Completed Takeaways */}
                  {isCompleted && (session.mentor_notes || session.recommendations) && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-2">
                      {session.mentor_notes && (
                        <div>
                          <div className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                            <FileText size={11} />
                            <span>Mentor Takeaways</span>
                          </div>
                          <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                            {session.mentor_notes}
                          </p>
                        </div>
                      )}
                      {session.recommendations && (
                        <div>
                          <div className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
                            <Lightbulb size={11} />
                            <span>Action Items</span>
                          </div>
                          <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                            {session.recommendations}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  {isOpen && (
                    <>
                      <span className="text-[11px] text-slate-400 italic">
                        Waiting for mentor to accept...
                      </span>
                      <button
                        onClick={() => handleCancel(session.id)}
                        className="px-3 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
                      >
                        Cancel Request
                      </button>
                    </>
                  )}

                  {isAccepted && !session.scheduled_at && (
                    <>
                      <span className="text-[11px] text-amber-300 font-medium">
                        Mentor accepted! Setting up meeting time...
                      </span>
                      <button
                        onClick={() => handleCancel(session.id)}
                        className="px-3 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {isScheduled && (
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[11px] text-indigo-300 flex items-center gap-1">
                        <Calendar size={12} />
                        <span>Ready to meet</span>
                      </span>
                      <button
                        onClick={() => handleJoinMeeting(session)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
                      >
                        <Video size={13} />
                        <span>Join Meeting</span>
                      </button>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="w-full text-right text-[11px] text-slate-500">
                      Completed on {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : 'N/A'}
                    </div>
                  )}

                  {isCancelled && (
                    <div className="w-full text-right text-[11px] text-rose-400/80">
                      Cancelled
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request Modal */}
      <RequestMentorModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={loadRequests}
      />

      {/* Jitsi Meeting Modal */}
      {activeMeetingSession && (
        <JitsiMeetingModal
          isOpen={!!activeMeetingSession}
          onClose={() => setActiveMeetingSession(null)}
          roomName={activeMeetingSession.meeting_room_id || `aven-session-${activeMeetingSession.id}`}
          sessionTitle={activeMeetingSession.title}
          userName={activeMeetingSession.learner_name || 'Learner'}
          userRole="learner"
          durationMinutes={activeMeetingSession.duration_minutes}
        />
      )}
    </div>
  );
}
