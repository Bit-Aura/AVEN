'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  Video,
  CheckCircle2,
} from 'lucide-react';
import { scheduleMentorSession } from '../../api/client';

interface SessionScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  onSuccess?: () => void;
}

export default function SessionScheduleDialog({
  isOpen,
  onClose,
  session,
  onSuccess,
}: SessionScheduleDialogProps) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(session?.duration_minutes || 30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate || !scheduledTime) {
      setErrorMsg('Please select both a date and time.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const combinedDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
      await scheduleMentorSession(session.id, {
        scheduled_at: combinedDateTime.toISOString(),
        duration_minutes: duration,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to schedule session', err);
      setErrorMsg(err?.message || 'Failed to schedule session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border bg-surface-secondary/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Schedule Mentor Session
              </h3>
              <p className="text-[11px] text-slate-400">
                Pick a meeting time and provision a Jitsi video room
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-surface-secondary/50 border border-border text-xs space-y-1">
            <div className="font-bold text-white">{session.title}</div>
            <div className="text-[11px] text-slate-400">
              Learner: <span className="text-slate-200 font-semibold">{session.learner_name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                Meeting Date
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                Meeting Time
              </label>
              <input
                type="time"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-[11px] text-indigo-300 flex items-center gap-2">
            <Video size={14} className="shrink-0" />
            <span>A secure, embedded Jitsi video room will be provisioned automatically upon scheduling.</span>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs shadow-glow-indigo transition-all"
            >
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
              <span>Confirm Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
