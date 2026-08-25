'use client';

import { useState } from 'react';
import { usePathStore } from '../store/usePathStore';
import { SendHorizonal, Sparkles, Target, Compass } from 'lucide-react';
import { useSafeUser } from '../lib/clerkSafe';

const PRESET_GOALS = [
  "I want to become a Backend Software Engineer in 4 months.",
  "Transition from Frontend to Full-Stack Developer.",
  "Learn Python API design and distributed backend architectures."
];

export default function GoalChat() {
  const [input, setInput] = useState('');
  const setUserGoal = usePathStore((state) => state.setUserGoal);
  const isLoading = usePathStore((state) => state.isLoading);
  const pathError = usePathStore((state) => state.pathError);
  const { user } = useSafeUser();

  const handleSubmit = (e?: React.FormEvent, preset?: string) => {
    if (e) e.preventDefault();
    const text = preset || input;
    if (!text.trim() || isLoading) return;
    const email = user?.primaryEmailAddress?.emailAddress || 'demo@pathfinder.dev';
    setUserGoal(text.trim(), email);
  };

  return (
    <div className="w-full max-w-2xl bg-surface border border-border p-8 rounded-2xl shadow-glass flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mb-6 shadow-glow-indigo">
        <Compass className="text-brand-400" size={24} />
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
        Where are you headed?
      </h1>
      <p className="text-slate-400 text-sm md:text-base mb-8 max-w-lg leading-relaxed">
        State your target career goal in natural language. PathFinder will parse your intent and conduct a short diagnostic to generate your deterministic skill graph.
      </p>

      {pathError && (
        <div className="w-full mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold text-left">
          {pathError}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="w-full relative mb-6">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. I want to become a Backend Software Engineer focusing on Python and cloud distributed systems..."
          className="w-full min-h-[130px] bg-background border border-border rounded-xl p-4 pr-14 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 resize-none transition-all text-sm leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute bottom-4 right-4 p-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-surface-tertiary disabled:text-slate-500 text-white rounded-lg transition-all flex items-center justify-center shadow-glow-indigo disabled:shadow-none"
          title="Initialize Diagnostic"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <SendHorizonal size={18} />
          )}
        </button>
      </form>

      {/* Preset Suggestions */}
      <div className="w-full text-left">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles size={12} className="text-brand-400" />
          <span>Quick presets</span>
        </div>
        <div className="flex flex-col gap-2">
          {PRESET_GOALS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInput(preset);
                handleSubmit(undefined, preset);
              }}
              disabled={isLoading}
              className="text-left px-3.5 py-2 rounded-lg bg-surface-secondary/50 hover:bg-surface-secondary border border-border/80 text-xs text-slate-300 hover:text-white transition-colors"
            >
              "{preset}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
