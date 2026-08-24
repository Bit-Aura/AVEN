'use client';

import { useState, useEffect } from 'react';
import { usePathStore } from '../store/usePathStore';
import { BrainCircuit, CheckCircle2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DiagnosticChat() {
  const router = useRouter();
  const completeDiagnostic = usePathStore((state) => state.completeDiagnostic);
  const userGoal = usePathStore((state) => state.userGoal);
  const nextQuestion = usePathStore((state) => state.nextQuestion);
  const diagnosticComplete = usePathStore((state) => state.diagnosticComplete);
  const isLoading = usePathStore((state) => state.isLoading);
  const pathError = usePathStore((state) => state.pathError);
  const nodes = usePathStore((state) => state.nodes);

  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'ai' | 'user', text: string }>>([]);
  const [turnCount, setTurnCount] = useState(1);

  // Initialize and update chat history on new questions
  useEffect(() => {
    if (nextQuestion) {
      setChatHistory((prev) => {
        const questionText = nextQuestion.question_text || JSON.stringify(nextQuestion);
        if (prev.some(m => m.text === questionText)) return prev;
        return [...prev, { sender: 'ai', text: questionText }];
      });
    }
  }, [nextQuestion]);

  const handleOptionSelect = (optionLabel: string) => {
    if (!nextQuestion || isLoading) return;
    setChatHistory((prev) => [...prev, { sender: 'user', text: optionLabel }]);
    setTurnCount((prev) => prev + 1);
    completeDiagnostic(nextQuestion.question_id || 'turn', optionLabel);
  };

  // If complete, show success screen
  if (diagnosticComplete) {
    return (
      <div className="w-full max-w-2xl bg-surface border border-border p-8 rounded-2xl shadow-glass flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-glow-emerald">
          <CheckCircle2 className="text-emerald-400" size={32} />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
          Deterministic Path Generated!
        </h2>
        <p className="text-slate-400 text-sm max-w-md mb-8">
          The Neo4j topological engine has plotted your shortest prerequisite path. Initial Bayesian Knowledge Tracing scores have been calibrated.
        </p>

        <div className="w-full p-4 rounded-xl bg-surface-secondary border border-border mb-8 text-left">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles size={13} className="text-indigo-400" />
            <span>Generated Milestones</span>
          </div>
          <div className="space-y-1.5">
            {nodes.slice(0, 4).map((node, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-200">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                  {idx + 1}
                </span>
                <span className="font-semibold">{node.data?.label as string || node.id}</span>
              </div>
            ))}
            {nodes.length > 4 && (
              <div className="text-[11px] text-slate-500 pl-7">
                + {nodes.length - 4} additional ordered prerequisite skills
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => router.push('/learner')}
          className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-glow-indigo transition-all"
        >
          <span>Launch Your Dashboard</span>
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-surface border border-border p-6 md:p-8 rounded-2xl shadow-glass flex flex-col h-[640px]">
      {/* Header */}
      <div className="border-b border-border pb-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
            <BrainCircuit className="text-indigo-400" size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Diagnostic Question {turnCount} of 3</h2>
            <p className="text-xs text-slate-400">Estimating cold-start skill mastery priors</p>
          </div>
        </div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            <Loader2 size={12} className="animate-spin" />
            <span>Analyzing response...</span>
          </div>
        )}
      </div>

      {pathError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
          {pathError}
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-brand-600 text-white rounded-br-none shadow-glow-indigo'
                  : 'bg-surface-secondary text-slate-200 border border-border rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-3.5 rounded-2xl bg-surface-secondary text-slate-400 border border-border rounded-bl-none flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="ml-1 text-slate-400">Planning graph...</span>
            </div>
          </div>
        )}
      </div>

      {/* Options Panel */}
      <div className="border-t border-border pt-4 min-h-[160px]">
        {nextQuestion && !isLoading && nextQuestion.options && nextQuestion.options.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Select your experience level:
            </div>
            <div className="grid grid-cols-1 gap-2">
              {nextQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(opt)}
                  disabled={isLoading}
                  className="w-full text-left px-4 py-3 bg-surface-secondary hover:bg-surface-tertiary border border-border hover:border-brand-500/50 rounded-xl text-xs md:text-sm font-medium text-slate-200 hover:text-white transition-all disabled:opacity-50"
                >
                  <span className="font-bold text-indigo-400 mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
