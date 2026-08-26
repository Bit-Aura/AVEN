'use client';

import React, { useState } from 'react';
import {
  X,
  Send,
  Loader2,
  Users,
  BrainCircuit,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { createMentorSessionRequest } from '../../api/client';

interface RequestMentorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSkillId?: string;
  defaultTitle?: string;
  onSuccess?: () => void;
}

export default function RequestMentorModal({
  isOpen,
  onClose,
  defaultSkillId,
  defaultTitle,
  onSuccess,
}: RequestMentorModalProps) {
  const [title, setTitle] = useState(defaultTitle || '');
  const [skillId, setSkillId] = useState(defaultSkillId || '');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !reason.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await createMentorSessionRequest({
        title: title.trim(),
        skill_id: skillId.trim() || undefined,
        reason: reason.trim(),
        description: description.trim(),
        requested_duration_minutes: duration,
      });

      setSuccessMsg('Session request submitted! An approved mentor will review and accept shortly.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Request mentor session failed', err);
      setErrorMsg(err?.message || 'Failed to submit session request. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-secondary/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Request 1-on-1 Mentor Session
              </h3>
              <p className="text-[11px] text-slate-400">
                Connect directly with a human industry mentor on your learning path
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
              Session Topic / Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Debugging async queue timeouts & worker concurrency"
              className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                Related Skill Identifier
              </label>
              <input
                type="text"
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                placeholder="e.g. async_python, postgres_indexing"
                className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                Preferred Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value={15}>15 Minutes (Quick Clarification)</option>
                <option value={30}>30 Minutes (Deep Dive / Code Review)</option>
                <option value={45}>45 Minutes (Architecture & System Design)</option>
                <option value={60}>60 Minutes (Full Mock Interview)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
              Why do you need human mentor help? <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Stuck on deadlock concept despite AI explanations and failing unit tests"
              className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
              Problem Description & What You Tried <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the exact code behavior, error messages, and what hypothesis you've tested so far..."
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
              disabled={isSubmitting || !!successMsg}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs shadow-glow-indigo transition-all"
            >
              {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
