'use client';

import { useState } from 'react';
import { usePathStore } from '../store/usePathStore';
import { SendHorizonal } from 'lucide-react';

export default function GoalChat() {
  const [input, setInput] = useState('');
  const setUserGoal = usePathStore((state) => state.setUserGoal);
  const isLoading = usePathStore((state) => state.isLoading);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setUserGoal(input.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Where are you headed?
        </h1>
        <p className="text-slate-400 mb-8 max-w-md">
          Tell PathFinder your goal in plain English, and we will build the exact shortest valid path to get you there.
        </p>

        <form onSubmit={handleSubmit} className="w-full relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. I want to become a Backend Engineer in four months..."
            className="w-full min-h-[120px] bg-slate-950 border border-slate-700 rounded-xl p-4 pr-16 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute bottom-4 right-4 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center justify-center"
            title="Start Path"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <SendHorizonal size={20} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
