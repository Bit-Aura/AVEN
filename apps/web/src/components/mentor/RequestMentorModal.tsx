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

/**
 * Enterprise-grade implementation of RequestMentorModal.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-aven-text/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-aven-base border border-aven-border w-full max-w-lg rounded-xl shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-aven-border bg-aven-surface flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-aven-base border border-aven-border text-aven-text">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-aven-text uppercase tracking-widest">
                Request 1-on-1 Mentor Session
              </h3>
              <p className="text-[11px] font-bold text-aven-text-subtle mt-0.5">
                Connect directly with a human industry mentor on your learning path
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-aven-text-subtle hover:text-aven-text p-1.5 rounded hover:bg-aven-base transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded bg-green-50 border border-green-200 text-green-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-aven-text uppercase tracking-widest mb-1.5">
              Session Topic / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Debugging async queue timeouts & worker concurrency"
              className="w-full bg-aven-base border border-aven-border rounded px-3 py-2 text-xs text-aven-text placeholder-[#a3a198] focus:outline-none focus:border-aven-text focus:ring-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-aven-text uppercase tracking-widest mb-1.5">
                Related Skill Identifier
              </label>
              <input
                type="text"
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                placeholder="e.g. async_python"
                className="w-full bg-aven-base border border-aven-border rounded px-3 py-2 text-xs text-aven-text placeholder-[#a3a198] focus:outline-none focus:border-aven-text focus:ring-0 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-aven-text uppercase tracking-widest mb-1.5">
                Preferred Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-aven-base border border-aven-border rounded px-3 py-2 text-xs text-aven-text focus:outline-none focus:border-aven-text focus:ring-0 cursor-pointer"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-aven-text uppercase tracking-widest mb-1.5">
              Why do you need human mentor help? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Stuck on deadlock concept..."
              className="w-full bg-aven-base border border-aven-border rounded px-3 py-2 text-xs text-aven-text placeholder-[#a3a198] focus:outline-none focus:border-aven-text focus:ring-0"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-aven-text uppercase tracking-widest mb-1.5">
              Problem Description & What You Tried <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the exact code behavior, error messages, and what hypothesis you've tested so far..."
              className="w-full bg-aven-base border border-aven-border rounded p-3 text-xs text-aven-text placeholder-[#a3a198] focus:outline-none focus:border-aven-text focus:ring-0"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-aven-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-aven-base border border-aven-border text-aven-text hover:border-aven-text text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!successMsg}
              className="flex items-center gap-2 px-5 py-2 rounded bg-aven-text-subtle hover:bg-aven-text disabled:opacity-50 text-aven-base font-black text-[10px] uppercase tracking-widest shadow-sm transition-all"
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
