'use client';

import { usePathStore } from '../store/usePathStore';
import { X, Send, User, Award } from 'lucide-react';
import { Robot } from '@phosphor-icons/react';
import { useState, useRef, useEffect } from 'react';

/**
 * Enterprise-grade Context-Aware AI Coaching Interface.
 * Operates as a non-blocking sliding drawer that integrates tightly with the global 
 * pathing state to provide Socratic tutoring tailored to the learner's exact active milestone.
 */
export default function AiCoachDrawer() {
  const activeCoachNodeId = usePathStore((state) => state.activeCoachNodeId);
  const closeCoach = usePathStore((state) => state.closeCoach);
  const nodes = usePathStore((state) => state.nodes) || [];
  const coachMessages = usePathStore((state) => state.coachMessages) || [];
  const isCoachTyping = usePathStore((state) => state.isCoachTyping);
  const sendCoachMessage = usePathStore((state) => state.sendCoachMessage);
  const coachPraiseCard = usePathStore((state) => state.coachPraiseCard);
  const openProofCard = usePathStore((state) => state.openProofCard);

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync with global store open triggers
  useEffect(() => {
    if (activeCoachNodeId) {
      setIsOpen(true);
    }
  }, [activeCoachNodeId]);

  const activeNode = nodes.find(n => n.id === activeCoachNodeId);
  const contextLabel = activeNode ? (activeNode.data as any)?.label : 'General Context';

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [coachMessages, isCoachTyping, isOpen]);

  // Escape to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isCoachTyping) return;

    const message = inputMessage.trim();
    setInputMessage('');
    // Use activeCoachNodeId or a fallback general ID
    await sendCoachMessage(activeCoachNodeId || 'general', message);
  };

  return (
    <>
      {/* Global Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-aven-text-subtle hover:bg-aven-text text-aven-base rounded-full flex items-center justify-center z-40 transition-transform hover:scale-105 active:scale-95 border border-aven-text shadow-lg"
        >
          <Robot size={32} weight="fill" />
        </button>
      )}

      {/* Centered Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-aven-text/20 backdrop-blur-sm font-sans antialiased">
          <div className="flex flex-col h-[85vh] max-h-[800px] w-full max-w-[800px] bg-aven-base text-aven-text rounded-2xl overflow-hidden border border-aven-border shadow-2xl relative">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-aven-border bg-aven-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-aven-text-subtle flex items-center justify-center text-aven-base">
                  <Robot size={24} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-aven-text font-black uppercase tracking-tight text-[15px] leading-tight">
                    AI Coach
                  </h3>
                  <div className="text-[11px] font-bold text-aven-text-subtle mt-0.5 uppercase tracking-wider">
                    Context: {contextLabel}
                  </div>
                </div>
              </div>
              <button 
                data-testid="close-coach"
                onClick={() => {
                  setIsOpen(false);
                  closeCoach(); // clear context if needed
                }}
                className="text-aven-text-muted hover:text-aven-text transition-colors w-8 h-8 flex items-center justify-center rounded-md hover:bg-aven-border"
              >
                <X size={20} />
              </button>
            </div>

            {/* Praise Card */}
            {coachPraiseCard && (
              <div className="mx-6 mt-6 bg-aven-text-subtle border border-aven-text-subtle rounded-xl p-4 animate-in fade-in slide-in-from-top-2 text-aven-base">
                <div className="flex items-start gap-3">
                  <Award className="text-aven-base shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-aven-base mb-1">Process Praise</h3>
                    <p className="text-[13px] font-medium leading-snug mb-3 text-aven-base/90">
                      {coachPraiseCard.message}
                    </p>
                    {coachPraiseCard.badge && (
                      <button 
                        onClick={() => {
                          setIsOpen(false);
                          openProofCard(coachPraiseCard.badge!);
                        }}
                        className="px-3 py-1.5 bg-aven-base hover:bg-aven-surface text-aven-text text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors border border-aven-text"
                      >
                        View Mastery Badge
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {coachMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                    msg.role === 'ai' ? 'bg-aven-text-subtle text-aven-base border-aven-text-subtle' : 'bg-aven-surface text-aven-text border-aven-border'
                  }`}>
                    {msg.role === 'ai' ? <Robot size={20} weight="fill" /> : <User size={20} />}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-[13px] font-medium leading-relaxed shadow-sm border ${
                    msg.role === 'ai' 
                      ? 'bg-aven-surface border-aven-border text-aven-text rounded-tl-none' 
                      : 'bg-aven-text-subtle border-aven-text text-aven-base rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isCoachTyping && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-aven-text-subtle text-aven-base border border-aven-text-subtle">
                    <Robot size={20} weight="fill" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl text-[13px] font-bold uppercase tracking-widest bg-aven-surface border border-aven-border text-aven-text-subtle rounded-tl-none animate-pulse">
                    Analyzing context...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 border-t border-aven-border bg-aven-base shrink-0">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask your coach for guidance..."
                  disabled={isCoachTyping}
                  className="flex-1 bg-aven-surface border border-aven-border hover:border-aven-text rounded-xl px-4 py-3 text-[13px] font-medium text-aven-text focus:outline-none focus:border-aven-text transition-colors disabled:opacity-50 placeholder-aven-text-muted"
                />
                <button 
                  type="submit"
                  disabled={isCoachTyping || !inputMessage.trim()}
                  className="px-5 bg-aven-text-subtle hover:bg-aven-text disabled:bg-aven-border disabled:border-aven-border disabled:text-aven-text-muted text-aven-base rounded-xl transition-all flex items-center justify-center shrink-0 border border-aven-text shadow-md disabled:shadow-none"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
