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

/**
 * Enterprise-grade implementation of SessionScheduleDialog.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
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
      <div className="bg-aven-base border border-aven-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-aven-border bg-aven-surface flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-aven-primary/10 border border-aven-primary/30 text-aven-primary">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-aven-text">
                Schedule Mentor Session
              </h3>
              <p className="text-[11px] text-aven-text-subtle">
                Pick a meeting time and provision a Jitsi video room
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-aven-text-subtle hover:text-aven-text p-1 rounded-lg hover:bg-aven-base transition-colors"
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

          <div className="p-3 rounded-xl bg-aven-surface border border-aven-border text-xs space-y-1">
            <div className="font-bold text-aven-text">{session.title}</div>
            <div className="text-[11px] text-aven-text-subtle">
              Learner: <span className="text-aven-text font-semibold">{session.learner_name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-aven-text-subtle uppercase mb-1.5">
                Meeting Date
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-aven-surface border border-aven-border rounded-xl px-3.5 py-2 text-xs text-aven-text focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-aven-text-subtle uppercase mb-1.5">
                Meeting Time
              </label>
              <input
                type="time"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-aven-surface border border-aven-border rounded-xl px-3.5 py-2 text-xs text-aven-text focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-aven-text-subtle uppercase mb-1.5">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-aven-surface border border-aven-border rounded-xl px-3.5 py-2 text-xs text-aven-text focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-aven-primary/10 border border-aven-primary/30 text-[11px] text-aven-primary flex items-center gap-2">
            <Video size={14} className="shrink-0" />
            <span>A secure, embedded Jitsi video room will be provisioned automatically upon scheduling.</span>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-aven-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-aven-base border border-aven-border text-xs font-semibold text-aven-text-subtle hover:text-aven-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-aven-text font-bold text-xs shadow-glow-indigo transition-all"
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
