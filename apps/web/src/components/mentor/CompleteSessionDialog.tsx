'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  FileText,
  Loader2,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { completeMentorSession } from '../../api/client';

interface CompleteSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  onSuccess?: () => void;
}

export default function CompleteSessionDialog({
  isOpen,
  onClose,
  session,
  onSuccess,
}: CompleteSessionDialogProps) {
  const [mentorNotes, setMentorNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorNotes.trim()) {
      setErrorMsg('Please enter session notes summarizing what was covered.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await completeMentorSession(session.id, {
        mentor_notes: mentorNotes.trim(),
        recommendations: recommendations.trim() || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to complete session', err);
      setErrorMsg(err?.message || 'Failed to record completion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border bg-surface-secondary/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Complete Session & Log Takeaways
              </h3>
              <p className="text-[11px] text-slate-400">
                Document guidance and actionable next steps for the learner
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

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
              <FileText size={13} className="text-indigo-400" />
              <span>Session Notes & Key Concepts Covered <span className="text-rose-400">*</span></span>
            </label>
            <textarea
              required
              rows={4}
              value={mentorNotes}
              onChange={(e) => setMentorNotes(e.target.value)}
              placeholder="e.g. Reviewed asyncio semaphore locking patterns. Identified mistake in task cancellation logic..."
              className="w-full bg-surface-secondary border border-border rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
              <Lightbulb size={13} className="text-amber-400" />
              <span>Recommendations & Next Steps for Learner</span>
            </label>
            <textarea
              rows={3}
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="e.g. 1. Re-attempt coding challenge #4. 2. Read official docs on asyncio.gather exception handling."
              className="w-full bg-surface-secondary border border-border rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-glow-emerald transition-all"
            >
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              <span>Mark Completed & Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
