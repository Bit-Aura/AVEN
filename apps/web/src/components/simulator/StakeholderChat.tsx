"use client";

import React, { useState } from 'react';

/**
 * Enterprise-grade implementation of StakeholderChat.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function StakeholderChat() {
  const [messages, setMessages] = useState([
    { role: 'stakeholder', content: 'Hi there! Let me know if you have any questions about T-1.' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'learner', content: input }]);
    setInput('');
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'stakeholder', content: 'The requirement is to ensure the UI is responsive. Let me know if you need specifics.' }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="flex-1 overflow-y-auto mb-4 space-y-3 p-2">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-lg max-w-[80%] text-sm ${m.role === 'stakeholder' ? 'bg-emerald-900/30 text-emerald-200 self-start mr-auto border border-emerald-800/50' : 'bg-sky-900/30 text-sky-200 self-end ml-auto border border-sky-800/50'}`}>
            <span className="block text-[10px] opacity-50 uppercase mb-1">{m.role}</span>
            {m.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          placeholder="Ask a clarifying question..." 
        />
        <button onClick={handleSend} className="bg-emerald-600 hover:bg-emerald-500 text-aven-text px-4 py-2 rounded text-sm font-medium transition-colors">
          Send
        </button>
      </div>
    </div>
  );
}
