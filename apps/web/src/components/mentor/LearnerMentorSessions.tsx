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

/**
 * Enterprise-grade implementation of LearnerMentorSessions.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-aven-surface border border-aven-border rounded-xl">
        <div>
          <div className="flex items-center gap-3">
            <Users className="text-aven-text" size={20} />
            <h2 className="text-lg font-black text-aven-text tracking-tight uppercase">
              My 1-on-1 Mentor Sessions
            </h2>
          </div>
          <p className="text-xs text-aven-text-subtle font-medium mt-1">
            Request expert guidance, join live Jitsi video meetings, and review post-session takeaways
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRequests}
            disabled={isLoading}
            className="p-2.5 rounded text-aven-text-subtle hover:bg-aven-border hover:text-aven-text transition-colors"
            title="Refresh Sessions"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aven-text-subtle hover:bg-aven-text text-aven-base font-bold text-xs shadow-md transition-all uppercase tracking-widest border border-aven-text"
          >
            <Plus size={16} />
            <span>Request Mentor Session</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sessions Grid / List */}
      {isLoading ? (
        <div className="p-12 text-center bg-aven-base border border-aven-border rounded-xl">
          <Loader2 className="animate-spin text-aven-text mx-auto" size={28} />
          <p className="text-xs text-aven-text-subtle mt-3 font-bold uppercase tracking-widest">Loading your mentor sessions...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center bg-aven-base border border-aven-border rounded-xl space-y-4">
          <Users className="text-aven-text-subtle mx-auto" size={36} />
          <div>
            <h3 className="text-base font-black text-aven-text uppercase tracking-tight">No Mentor Sessions Requested Yet</h3>
            <p className="text-sm text-aven-text-subtle mt-2 max-w-lg mx-auto font-medium leading-relaxed">
              Whenever you feel stuck on a coding challenge, architecture problem, or interview topic, request a 1-on-1 human mentor session.
            </p>
          </div>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-aven-text-subtle hover:bg-aven-text text-aven-base font-bold text-xs shadow-md transition-all mt-4 uppercase tracking-widest border border-aven-text"
          >
            <Plus size={16} />
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
                className="p-6 rounded-xl bg-aven-base border border-aven-text/20 hover:border-aven-text/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Status Badge & Duration */}
                  <div className="flex items-center justify-between pb-3 border-b border-aven-border">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                        isCompleted
                          ? 'bg-aven-text text-aven-base border-aven-text'
                          : isScheduled
                          ? 'bg-aven-text-subtle text-aven-base border-aven-text-subtle animate-pulse'
                          : isAccepted
                          ? 'bg-aven-surface text-aven-text border-aven-text'
                          : isOpen
                          ? 'bg-aven-base text-aven-text border-aven-text border-dashed'
                          : 'bg-aven-surface text-aven-text-subtle border-aven-border'
                      }`}
                    >
                      {session.status}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-aven-text-subtle font-bold">
                      <Clock size={14} />
                      <span>{session.duration_minutes} MINS</span>
                    </div>
                  </div>

                  {/* Title & Reason */}
                  <div className="mt-4">
                    <h3 className="text-base font-black text-aven-text uppercase tracking-tight line-clamp-1">{session.title}</h3>
                    {session.skill_id && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-aven-surface text-aven-text text-[10px] font-bold uppercase tracking-widest border border-aven-border">
                        SKILL: {session.skill_id}
                      </span>
                    )}
                    <p className="text-sm text-aven-text-subtle mt-3 leading-relaxed line-clamp-2 font-medium">
                      {session.description}
                    </p>
                  </div>

                  {/* Mentor Assigned Info */}
                  {session.mentor_name && (
                    <div className="mt-4 p-3 rounded-lg bg-aven-surface border border-aven-border flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] text-aven-text-subtle font-bold uppercase tracking-widest">Assigned Mentor</div>
                        <div className="font-black text-aven-text mt-0.5">{session.mentor_name}</div>
                      </div>
                      {session.scheduled_at && (
                        <div className="text-right">
                          <div className="text-[10px] text-aven-text-subtle font-bold uppercase tracking-widest">Scheduled</div>
                          <div className="font-black text-aven-text mt-0.5">
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
                    <div className="mt-4 p-4 rounded-lg bg-aven-base border border-aven-text text-xs space-y-3">
                      {session.mentor_notes && (
                        <div>
                          <div className="text-[10px] font-black text-aven-text uppercase tracking-widest flex items-center gap-1.5">
                            <FileText size={12} />
                            <span>Mentor Takeaways</span>
                          </div>
                          <p className="text-aven-text-subtle text-xs mt-1 font-medium leading-relaxed">
                            {session.mentor_notes}
                          </p>
                        </div>
                      )}
                      {session.recommendations && (
                        <div>
                          <div className="text-[10px] font-black text-aven-text uppercase tracking-widest flex items-center gap-1.5">
                            <Lightbulb size={12} />
                            <span>Action Items</span>
                          </div>
                          <p className="text-aven-text-subtle text-xs mt-1 font-medium leading-relaxed">
                            {session.recommendations}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 border-t border-aven-border flex items-center justify-between">
                  {isOpen && (
                    <>
                      <span className="text-[10px] font-bold text-aven-text-subtle uppercase tracking-widest italic">
                        Waiting for mentor...
                      </span>
                      <button
                        onClick={() => handleCancel(session.id)}
                        className="px-3 py-1.5 rounded bg-aven-base border border-aven-border text-aven-text hover:border-red-500 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        Cancel Request
                      </button>
                    </>
                  )}

                  {isAccepted && !session.scheduled_at && (
                    <>
                      <span className="text-[10px] font-bold text-aven-text uppercase tracking-widest">
                        Setting up meeting...
                      </span>
                      <button
                        onClick={() => handleCancel(session.id)}
                        className="px-3 py-1.5 rounded bg-aven-base border border-aven-border text-aven-text hover:border-red-500 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {isScheduled && (
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[10px] font-bold text-aven-text uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span>Ready to meet</span>
                      </span>
                      <button
                        onClick={() => handleJoinMeeting(session)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-aven-text-subtle hover:bg-aven-text text-aven-base font-black text-xs uppercase tracking-widest border border-aven-text transition-colors"
                      >
                        <Video size={14} />
                        <span>Join Meeting</span>
                      </button>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="w-full text-right text-[10px] font-bold text-aven-text-subtle uppercase tracking-widest">
                      Completed {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : ''}
                    </div>
                  )}

                  {isCancelled && (
                    <div className="w-full text-right text-[10px] font-bold text-red-500 uppercase tracking-widest">
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
