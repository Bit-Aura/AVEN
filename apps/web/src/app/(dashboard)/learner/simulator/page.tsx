'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  MessageSquare, 
  Code2, 
  CheckSquare, 
  Send, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  GitPullRequest, 
  ArrowRight,
  RefreshCw,
  FolderCode
} from 'lucide-react';
import { usePathStore } from '../../../../store/usePathStore';

interface Ticket {
  id: string;
  title: string;
  skill_id: string;
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'MERGED';
  description: string;
  acceptance_criteria: string[];
  affected_files: string[];
}

interface ChatMessage {
  sender: 'user' | 'ai';
  persona: string;
  text: string;
  timestamp: Date;
}

interface PRComment {
  line_number: number;
  file_path: string;
  comment: string;
  severity: 'BLOCKER' | 'SUGGESTION' | 'LINT';
}

interface PRResult {
  approved: boolean;
  general_feedback: string;
  comments: PRComment[];
}

export default function DayOneSimulatorPage() {
  const profileId = usePathStore((state) => state.profileId) || 1;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<'requirements' | 'chat' | 'code' | 'review'>('requirements');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Stakeholder Chat State
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [chatInput, setChatInput] = useState<string>('');
  const [persona, setPersona] = useState<'pm' | 'client'>('pm');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  
  // Code Editor State
  const [codeContent, setCodeContent] = useState<string>('');
  
  // PR Review State
  const [prResult, setPrResult] = useState<Record<string, PRResult | null>>({});
  const [isSubmittingPr, setIsSubmittingPr] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Tickets
  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/simulator/tickets/${profileId}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (data.length > 0 && !selectedTicket) {
          // Select the first IN_PROGRESS or TODO ticket automatically
          const active = data.find((t: Ticket) => t.status === 'IN_PROGRESS') || data[0];
          setSelectedTicket(active);
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [profileId]);

  // Sync default code when ticket changes
  useEffect(() => {
    if (selectedTicket) {
      setCodeContent(
        `// Code Workspace for ${selectedTicket.title}\n` +
        `// Target File: ${selectedTicket.affected_files.join(', ')}\n\n` +
        `function processTask() {\n` +
        `  // TODO: Implement requirements based on PM feedback\n` +
        `  console.log("Processing ticket ${selectedTicket.id}...");\n` +
        `  return true;\n` +
        `}\n`
      );
    }
  }, [selectedTicket]);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedTicket, persona]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedTicket) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      persona: 'developer',
      text: chatInput,
      timestamp: new Date()
    };

    const currentTicketId = selectedTicket.id;
    setChatMessages(prev => ({
      ...prev,
      [currentTicketId]: [...(prev[currentTicketId] || []), userMsg]
    }));
    setChatInput('');
    setIsSendingChat(true);

    try {
      const res = await fetch(`http://localhost:8000/api/v1/simulator/ticket/${selectedTicket.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          message: userMsg.text,
          persona: persona
        })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          sender: 'ai',
          persona: data.persona,
          text: data.message,
          timestamp: new Date()
        };
        setChatMessages(prev => ({
          ...prev,
          [currentTicketId]: [...(prev[currentTicketId] || []), aiMsg]
        }));
      }
    } catch (err) {
      console.error('Chat failed:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  const submitPullRequest = async () => {
    if (!selectedTicket) return;

    setIsSubmittingPr(true);
    setActiveTab('review');

    try {
      const res = await fetch(`http://localhost:8000/api/v1/simulator/ticket/${selectedTicket.id}/submit-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          code_content: codeContent,
          snapshots: []
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPrResult(prev => ({
          ...prev,
          [selectedTicket.id]: data
        }));

        // If approved, dynamically update ticket status in UI
        if (data.approved) {
          setTickets(prev => 
            prev.map(t => t.id === selectedTicket.id ? { ...t, status: 'MERGED' } : t)
          );
        } else {
          setTickets(prev => 
            prev.map(t => t.id === selectedTicket.id ? { ...t, status: 'UNDER_REVIEW' } : t)
          );
        }
      }
    } catch (err) {
      console.error('PR submission failed:', err);
    } finally {
      setIsSubmittingPr(false);
    }
  };

  const columns = [
    { title: 'Backlog', status: 'BACKLOG', color: 'border-slate-800 bg-slate-900/40 text-slate-400' },
    { title: 'To Do', status: 'TODO', color: 'border-blue-900/50 bg-blue-950/10 text-blue-400' },
    { title: 'In Progress', status: 'IN_PROGRESS', color: 'border-amber-900/50 bg-amber-950/10 text-amber-400' },
    { title: 'Under Review', status: 'UNDER_REVIEW', color: 'border-purple-900/50 bg-purple-950/10 text-purple-400' },
    { title: 'Merged', status: 'MERGED', color: 'border-emerald-950 bg-emerald-950/10 text-emerald-400' }
  ];

  return (
    <div className="flex flex-col gap-6 min-h-screen text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface p-6 rounded-2xl border border-border shadow-md">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <GitPullRequest className="text-indigo-500" /> Day-One Simulator Workspace
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pick up project tickets, gather requirements from stakeholders, and submit PRs for code reviews.
          </p>
        </div>
        <button 
          onClick={fetchTickets}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition font-semibold text-xs"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Board
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Kanban Board Container (Left Column) */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-20 bg-surface/50 border border-border rounded-2xl h-96">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="animate-spin text-indigo-500" size={32} />
                <span className="text-sm text-slate-400">Loading simulator dashboard...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {columns.map(col => {
                const colTickets = tickets.filter(t => t.status === col.status);
                return (
                  <div key={col.status} className="flex flex-col gap-3 min-h-[450px]">
                    <div className={`px-3 py-2 rounded-lg border border-dashed flex justify-between items-center ${col.color}`}>
                      <span className="font-bold text-xs uppercase tracking-wider">{col.title}</span>
                      <span className="font-extrabold text-xs">{colTickets.length}</span>
                    </div>
                    
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-1">
                      {colTickets.length === 0 ? (
                        <div className="text-[10px] text-slate-600 text-center py-8 border border-dashed border-slate-800/40 rounded-xl">
                          No tickets
                        </div>
                      ) : (
                        colTickets.map(t => {
                          const isSelected = selectedTicket?.id === t.id;
                          return (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTicket(t)}
                              className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                                isSelected 
                                  ? 'bg-indigo-950/40 border-indigo-500/80 shadow-glow-indigo' 
                                  : 'bg-surface hover:bg-surface-secondary border-border/80'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded">
                                  {t.id}
                                </span>
                                <span className={`w-2 h-2 rounded-full ${
                                  t.status === 'MERGED' ? 'bg-emerald-400' :
                                  t.status === 'UNDER_REVIEW' ? 'bg-purple-400' :
                                  t.status === 'IN_PROGRESS' ? 'bg-amber-400' : 'bg-slate-400'
                                }`} />
                              </div>
                              <h3 className="font-bold text-xs text-white line-clamp-2 leading-snug">
                                {t.title}
                              </h3>
                              <div className="mt-3 flex flex-wrap gap-1">
                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-indigo-400 font-bold rounded">
                                  {t.skill_id}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Workspace IDE & Details Pane (Right Column) */}
        <div className="xl:col-span-1 bg-surface border border-border rounded-2xl shadow-lg flex flex-col overflow-hidden min-h-[600px]">
          {selectedTicket ? (
            <>
              {/* Header Title */}
              <div className="p-5 border-b border-border bg-surface-secondary">
                <div className="flex justify-between items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-indigo-400 font-mono">{selectedTicket.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    selectedTicket.status === 'MERGED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    selectedTicket.status === 'UNDER_REVIEW' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    selectedTicket.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <h2 className="font-extrabold text-sm text-white leading-tight">{selectedTicket.title}</h2>
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="flex border-b border-border bg-slate-950/20 text-xs">
                <button
                  onClick={() => setActiveTab('requirements')}
                  className={`flex-1 py-3 text-center border-b-2 font-semibold transition ${
                    activeTab === 'requirements' 
                      ? 'border-indigo-500 text-white bg-indigo-500/5' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📋 Task Specs
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-3 text-center border-b-2 font-semibold transition ${
                    activeTab === 'chat' 
                      ? 'border-indigo-500 text-white bg-indigo-500/5' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  💬 Slack Chat
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`flex-1 py-3 text-center border-b-2 font-semibold transition ${
                    activeTab === 'code' 
                      ? 'border-indigo-500 text-white bg-indigo-500/5' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  💻 IDE Editor
                </button>
                <button
                  onClick={() => setActiveTab('review')}
                  className={`flex-1 py-3 text-center border-b-2 font-semibold transition ${
                    activeTab === 'review' 
                      ? 'border-indigo-500 text-white bg-indigo-500/5' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🔍 PR Review
                </button>
              </div>

              {/* Tab Content Panels */}
              <div className="flex-1 p-5 overflow-y-auto max-h-[450px]">
                {/* Requirements Tab */}
                {activeTab === 'requirements' && (
                  <div className="flex flex-col gap-4 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Description</h4>
                      <p className="text-slate-300 leading-relaxed">{selectedTicket.description}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Affected Workspace Files</h4>
                      <div className="flex flex-col gap-1.5">
                        {selectedTicket.affected_files.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 font-mono text-[11px]">
                            <FolderCode size={14} />
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Acceptance Criteria</h4>
                      <div className="flex flex-col gap-2">
                        {selectedTicket.acceptance_criteria.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/40">
                            <CheckSquare className="text-indigo-500 shrink-0 mt-0.5" size={14} />
                            <span className="text-slate-300 leading-tight">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Stakeholder Chat Tab */}
                {activeTab === 'chat' && (
                  <div className="flex flex-col h-[400px]">
                    {/* Persona Toggle */}
                    <div className="flex justify-between items-center bg-slate-900 p-2 rounded-lg border border-slate-800 mb-3 text-xs">
                      <span className="text-slate-400 font-semibold px-2">Stakeholder Persona:</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPersona('pm')}
                          className={`px-3 py-1 rounded font-bold transition ${
                            persona === 'pm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Product Manager
                        </button>
                        <button
                          onClick={() => setPersona('client')}
                          className={`px-3 py-1 rounded font-bold transition ${
                            persona === 'client' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Non-Tech Client
                        </button>
                      </div>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 p-2 bg-slate-950/40 rounded-xl border border-slate-900 mb-3 text-xs">
                      <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-indigo-400 text-center leading-relaxed">
                        Slack channel for ticket <strong>#{selectedTicket.id}</strong>. Ask clarifying questions regarding criteria or API schemas.
                      </div>
                      
                      {(chatMessages[selectedTicket.id] || []).map((msg, index) => (
                        <div
                          key={index}
                          className={`flex flex-col max-w-[85%] rounded-xl p-3 leading-normal ${
                            msg.sender === 'user'
                              ? 'self-end bg-indigo-600 text-white rounded-tr-none'
                              : 'self-start bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/80'
                          }`}
                        >
                          <span className="text-[10px] font-bold opacity-75 uppercase tracking-wider mb-1">
                            {msg.sender === 'user' ? 'You' : msg.persona.toUpperCase()}
                          </span>
                          <p>{msg.text}</p>
                        </div>
                      ))}
                      {isSendingChat && (
                        <div className="self-start bg-slate-800 text-slate-400 rounded-xl p-3 rounded-tl-none border border-slate-700 italic">
                          Stakeholder is typing...
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                        placeholder={`Ask the ${persona === 'pm' ? 'Product Manager' : 'Client'}...`}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={sendChatMessage}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition flex items-center justify-center shrink-0"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* IDE Code Editor Tab */}
                {activeTab === 'code' && (
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 overflow-hidden shadow-inner">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-b border-slate-900 pb-2 mb-2">
                        <span>index.ts</span>
                        <span className="text-indigo-400">TypeScript IDE sidecar</span>
                      </div>
                      <textarea
                        value={codeContent}
                        onChange={(e) => setCodeContent(e.target.value)}
                        className="w-full h-72 bg-transparent text-slate-300 font-mono text-[11px] leading-relaxed resize-none focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={submitPullRequest}
                      disabled={isSubmittingPr}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                    >
                      <GitPullRequest size={14} />
                      {isSubmittingPr ? 'Reviewing Pull Request...' : 'Submit Pull Request (Open PR)'}
                    </button>
                  </div>
                )}

                {/* PR Review Details Tab */}
                {activeTab === 'review' && (
                  <div className="flex flex-col gap-4 text-xs">
                    {isSubmittingPr ? (
                      <div className="flex flex-col items-center gap-3 py-16">
                        <RefreshCw className="animate-spin text-indigo-500" size={32} />
                        <p className="text-slate-400 text-center">
                          Running automated checks & invoking Senior Developer LLM...
                        </p>
                      </div>
                    ) : prResult[selectedTicket.id] ? (
                      <div className="flex flex-col gap-4">
                        {/* Approval Status Header */}
                        {prResult[selectedTicket.id]?.approved ? (
                          <div className="flex items-center gap-3 p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                            <CheckCircle2 className="shrink-0" />
                            <div>
                              <h4 className="font-bold text-white text-xs">PR Approved & Merged!</h4>
                              <p className="text-[11px] text-emerald-400/90 mt-0.5">Telemetry successfully generated. BKT mastery progress updated.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400">
                            <AlertCircle className="shrink-0" />
                            <div>
                              <h4 className="font-bold text-white text-xs">PR Rejected with Blocker issues</h4>
                              <p className="text-[11px] text-red-400/90 mt-0.5">Please fix blockages noted in line annotations below.</p>
                            </div>
                          </div>
                        )}

                        {/* General Feedback */}
                        <div>
                          <h4 className="font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">General Feedback</h4>
                          <p className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl leading-relaxed text-slate-300">
                            {prResult[selectedTicket.id]?.general_feedback}
                          </p>
                        </div>

                        {/* Line Annotations */}
                        <div>
                          <h4 className="font-bold text-slate-400 mb-2.5 uppercase tracking-wider text-[10px]">Line-by-Line Comments</h4>
                          <div className="flex flex-col gap-2.5">
                            {prResult[selectedTicket.id]?.comments.map((comment, idx) => (
                              <div key={idx} className="border border-slate-800 bg-slate-900/50 rounded-xl p-3.5 flex flex-col gap-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-mono text-indigo-400">
                                    {comment.file_path} : Line {comment.line_number}
                                  </span>
                                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                    comment.severity === 'BLOCKER' ? 'bg-red-500/20 text-red-400' :
                                    comment.severity === 'SUGGESTION' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {comment.severity}
                                  </span>
                                </div>
                                <p className="text-slate-300 leading-normal">{comment.comment}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-2">
                        <Code2 size={32} className="text-slate-600" />
                        <p>No active PR submissions. Head to the IDE Editor tab to submit your code.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-slate-500 gap-2 h-96">
              <Briefcase size={36} className="text-slate-600" />
              <p className="font-bold text-sm">Select a ticket from the board</p>
              <p className="text-xs max-w-xs leading-relaxed">
                Click any ticket in the Kanban board cols to review requirements, consult stakeholders, and write code.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
