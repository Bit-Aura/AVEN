'use client';

import { useState, useEffect } from 'react';
import { usePathStore } from '../store/usePathStore';

export default function DiagnosticChat() {
  const completeDiagnostic = usePathStore((state) => state.completeDiagnostic);
  const userGoal = usePathStore((state) => state.userGoal);
  const nextQuestion = usePathStore((state) => state.nextQuestion);
  const isLoading = usePathStore((state) => state.isLoading);
  
  const [chatHistory, setChatHistory] = useState([
    { sender: 'ai', text: `You want to: "${userGoal}". Let's do a quick diagnostic.` }
  ]);

  // When nextQuestion updates, add it to the chat history if it's not already there
  useEffect(() => {
    if (nextQuestion) {
      setChatHistory((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.text === nextQuestion.question_text) return prev;
        return [...prev, { sender: 'ai', text: nextQuestion.question_text }];
      });
    }
  }, [nextQuestion]);

  const handleOptionSelect = (optionLabel: string) => {
    if (!nextQuestion || isLoading) return;
    
    // Add user response to chat
    setChatHistory((prev) => [...prev, { sender: 'user', text: optionLabel }]);

    // Submit answer to backend
    completeDiagnostic(nextQuestion.question_id, optionLabel);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl flex flex-col h-[600px]">
        <h2 className="text-2xl font-bold mb-6 text-slate-200 border-b border-slate-800 pb-4 flex justify-between items-center">
          <span>Skill Baseline Diagnostic</span>
          {isLoading && <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>}
        </h2>
        
        <div className="flex-1 overflow-y-auto space-y-6 mb-6 px-2 scrollbar-thin scrollbar-thumb-slate-700 flex flex-col">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {/* Typing Indicator while waiting for the backend */}
          {isLoading && (
            <div className="flex justify-start">
               <div className="max-w-[80%] p-4 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 rounded-bl-sm flex gap-1 items-center">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-6 min-h-[200px]">
          {nextQuestion && !isLoading && (
            <>
              <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">Select an option:</p>
              <div className="flex flex-col gap-3">
                {nextQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(opt)}
                    disabled={isLoading}
                    className="w-full text-left p-4 bg-slate-950 border border-slate-700 rounded-xl hover:bg-slate-800 hover:border-blue-500/50 transition-all text-slate-300 disabled:opacity-50"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
