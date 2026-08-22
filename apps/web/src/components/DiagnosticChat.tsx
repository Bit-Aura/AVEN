'use client';

import { useState } from 'react';
import { usePathStore } from '../store/usePathStore';

// Mock bounded question bank (since backend is handled by Sriram)
const diagnosticQuestions = [
  {
    id: 'q1',
    text: "Great! To build the best path, let's figure out where you're starting. How comfortable are you with variables and loops in any programming language?",
    options: [
      { label: "I've never coded before", value: 'none' },
      { label: "I know the basics", value: 'basic' },
      { label: "I can write small scripts easily", value: 'intermediate' },
    ]
  },
  {
    id: 'q2',
    text: "Got it. Have you ever interacted with a database (like writing a SQL query or using an ORM)?",
    options: [
      { label: "No, never", value: 'none' },
      { label: "I've written basic SELECT statements", value: 'basic' },
      { label: "I can write complex JOINs", value: 'advanced' },
    ]
  }
];

export default function DiagnosticChat() {
  const completeDiagnostic = usePathStore((state) => state.completeDiagnostic);
  const userGoal = usePathStore((state) => state.userGoal);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [chatHistory, setChatHistory] = useState([
    { sender: 'ai', text: `You want to: "${userGoal}". Let's do a quick diagnostic.` }
  ]);

  const handleOptionSelect = (optionLabel: string) => {
    // Add user response to chat
    setChatHistory((prev) => [...prev, { sender: 'user', text: optionLabel }]);

    // Move to next question or complete
    if (currentQuestionIndex < diagnosticQuestions.length - 1) {
      setTimeout(() => {
        setChatHistory((prev) => [
          ...prev, 
          { sender: 'ai', text: diagnosticQuestions[currentQuestionIndex + 1].text }
        ]);
        setCurrentQuestionIndex((prev) => prev + 1);
      }, 500); // Small delay to feel conversational
    } else {
      setTimeout(() => {
        completeDiagnostic();
      }, 800);
    }
  };

  const currentQuestion = diagnosticQuestions[currentQuestionIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl flex flex-col h-[600px]">
        <h2 className="text-2xl font-bold mb-6 text-slate-200 border-b border-slate-800 pb-4">
          Skill Baseline Diagnostic
        </h2>
        
        <div className="flex-1 overflow-y-auto space-y-6 mb-6 px-2 scrollbar-thin scrollbar-thumb-slate-700">
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
          {/* Always render the current question text as the last AI message if we are actively answering it */}
          {chatHistory[chatHistory.length - 1]?.sender === 'user' && currentQuestionIndex < diagnosticQuestions.length - 1 && (
            <div className="flex justify-start">
               <div className="max-w-[80%] p-4 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 rounded-bl-sm animate-pulse">
                ...
              </div>
            </div>
          )}
          {chatHistory[chatHistory.length - 1]?.sender !== 'user' && (
             <div className="flex justify-start">
              <div className="max-w-[80%] p-4 rounded-2xl bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm">
                {currentQuestion.text}
              </div>
             </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-6">
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">Select an option:</p>
          <div className="flex flex-col gap-3">
            {currentQuestion.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionSelect(opt.label)}
                disabled={chatHistory[chatHistory.length - 1]?.sender === 'user'}
                className="w-full text-left p-4 bg-slate-950 border border-slate-700 rounded-xl hover:bg-slate-800 hover:border-blue-500/50 transition-all text-slate-300 disabled:opacity-50"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
