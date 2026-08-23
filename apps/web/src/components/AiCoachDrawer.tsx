'use client';

import { usePathStore } from '../store/usePathStore';
import { X, Send, Bot, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function AiCoachDrawer() {
  const { 
    activeCoachNodeId, 
    closeCoach, 
    nodes,
    coachMessages,
    isCoachTyping,
    sendCoachMessage
  } = usePathStore();

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeNode = nodes.find(n => n.id === activeCoachNodeId);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [coachMessages, isCoachTyping]);

  // Escape to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCoach();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeCoach]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isCoachTyping) return;

    const message = inputMessage.trim();
    setInputMessage('');
    await sendCoachMessage(activeCoachNodeId!, message);
  };

  if (!activeCoachNodeId) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-[400px] bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2 text-indigo-400 font-medium">
          <Bot size={20} />
          <span>AI Coach</span>
        </div>
        <button 
          data-testid="close-coach"
          onClick={closeCoach}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Context Badge */}
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
        Context: <span className="text-slate-300 font-medium">{(activeNode?.data as any)?.label || ''}</span>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {coachMessages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'ai' ? 'bg-indigo-600' : 'bg-slate-700'
            }`}>
              {msg.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${
              msg.role === 'ai' 
                ? 'bg-slate-800 text-slate-200 rounded-tl-none' 
                : 'bg-indigo-600 text-white rounded-tr-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isCoachTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-indigo-600">
              <Bot size={16} />
            </div>
            <div className="px-4 py-2 rounded-2xl text-sm bg-slate-800 text-slate-400 rounded-tl-none animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask your coach..."
            disabled={isCoachTyping}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={isCoachTyping || !inputMessage.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
