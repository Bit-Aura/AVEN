'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
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
  FolderCode,
  Maximize2,
  Minimize2,
  Sparkles,
  Users,
  Terminal,
  HelpCircle,
  FileCode,
  Check,
  X,
  AlertTriangle,
  Info,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { usePathStore } from '../../../../store/usePathStore';

// Dynamic import of Monaco Editor with SSR disabled for Next.js
/**
 * Enterprise-grade implementation of Editor.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

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

function getLanguageForTicket(ticket: Ticket): { language: string; extension: string; label: string } {
  const affectedFile = ticket.affected_files?.[0] || '';
  const skill = ticket.skill_id.toLowerCase();
  
  if (affectedFile.endsWith('.sql') || skill.includes('sql') || skill.includes('db_') || skill.includes('postgres') || skill.includes('meta')) {
    return { language: 'sql', extension: 'sql', label: 'PostgreSQL SQL' };
  }
  if (affectedFile.endsWith('.py') || skill.includes('python') || skill.includes('fastapi') || skill.includes('async')) {
    return { language: 'python', extension: 'py', label: 'Python 3.12' };
  }
  if (affectedFile.endsWith('.sh') || skill.includes('git') || skill.includes('bash') || skill.includes('deploy')) {
    return { language: 'shell', extension: 'sh', label: 'Bash Shell' };
  }
  if (affectedFile.endsWith('.json')) {
    return { language: 'json', extension: 'json', label: 'JSON' };
  }
  if (affectedFile.endsWith('.ts') || affectedFile.endsWith('.tsx') || skill.includes('react') || skill.includes('typescript')) {
    return { language: 'typescript', extension: 'ts', label: 'TypeScript' };
  }
  if (affectedFile.endsWith('.js') || affectedFile.endsWith('.jsx')) {
    return { language: 'javascript', extension: 'js', label: 'JavaScript' };
  }
  return { language: 'python', extension: 'py', label: 'Python' };
}

function getStarterCodeForTicket(ticket: Ticket): string {
  const { language, extension } = getLanguageForTicket(ticket);
  const affectedFile = ticket.affected_files?.[0] || `app/services/${ticket.skill_id}.${extension}`;
  
  if (language === 'sql') {
    return (
      `-- =========================================================\n` +
      `-- Ticket #${ticket.id}: ${ticket.title}\n` +
      `-- Target File: ${affectedFile}\n` +
      `-- Acceptance Criteria:\n` +
      ticket.acceptance_criteria.map(c => `--   * ${c}`).join('\n') + `\n` +
      `-- =========================================================\n\n` +
      `-- 1. Create client_metadata table\n` +
      `CREATE TABLE IF NOT EXISTS client_metadata (\n` +
      `    id SERIAL PRIMARY KEY,\n` +
      `    client_id VARCHAR(64) NOT NULL UNIQUE,\n` +
      `    metadata JSONB DEFAULT '{}'::jsonb,\n` +
      `    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n` +
      `    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n` +
      `);\n\n` +
      `-- 2. Fast Index for client lookups\n` +
      `CREATE INDEX IF NOT EXISTS idx_client_metadata_client_id ON client_metadata(client_id);\n\n` +
      `-- 3. Upsert Migration Query\n` +
      `-- INSERT INTO client_metadata (client_id, metadata) VALUES ($1, $2)\n` +
      `-- ON CONFLICT (client_id) DO UPDATE SET metadata = EXCLUDED.metadata, updated_at = CURRENT_TIMESTAMP;\n`
    );
  }

  if (language === 'python') {
    const formattedClassName = ticket.skill_id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    return (
      `# =========================================================\n` +
      `# Ticket #${ticket.id}: ${ticket.title}\n` +
      `# Target File: ${affectedFile}\n` +
      `# Acceptance Criteria:\n` +
      ticket.acceptance_criteria.map(c => `#   * ${c}`).join('\n') + `\n` +
      `# =========================================================\n\n` +
      `import logging\n` +
      `from typing import List, Dict, Any, Optional\n\n` +
      `logger = logging.getLogger(__name__)\n\n` +
      `class ${formattedClassName}Handler:\n` +
      `    def __init__(self):\n` +
      `        self.initialized = True\n\n` +
      `    def process_task(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:\n` +
      `        \"\"\"\n` +
      `        Process and validate records according to ticket criteria.\n` +
      `        \"\"\"\n` +
      `        results = []\n` +
      `        for record in records:\n` +
      `            # TODO: Implement robust handling & validation\n` +
      `            results.append(record)\n` +
      `        return results\n`
    );
  }

  if (language === 'shell') {
    return (
      `#!/usr/bin/env bash\n` +
      `# =========================================================\n` +
      `# Ticket #${ticket.id}: ${ticket.title}\n` +
      `# Target File: ${affectedFile}\n` +
      `# =========================================================\n\n` +
      `set -euo pipefail\n\n` +
      `echo "Executing deployment verification for ${ticket.id}..."\n` +
      `export ENVIRONMENT="staging"\n\n` +
      `# Run health smoke check\n` +
      `curl -f http://127.0.0.1:8000/health || exit 1\n` +
      `echo "Deployment verified successfully."\n`
    );
  }

  return (
    `// =========================================================\n` +
    `// Ticket #${ticket.id}: ${ticket.title}\n` +
    `// Target File: ${affectedFile}\n` +
    `// =========================================================\n\n` +
    `export interface TaskPayload {\n` +
    `  id: string;\n` +
    `  status: string;\n` +
    `}\n\n` +
    `export function executeTask(payload: TaskPayload): boolean {\n` +
    `  // TODO: Implement solution meeting acceptance criteria\n` +
    `  return true;\n` +
    `}\n`
  );
}

/**
 * Enterprise-grade implementation of DayOneSimulatorPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function DayOneSimulatorPage() {
  const profileId = usePathStore((state) => state.profileId) || 1;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<'requirements' | 'chat' | 'review' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Stakeholder Chat State
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [chatInput, setChatInput] = useState<string>('');
  const [persona, setPersona] = useState<'pm' | 'client'>('pm');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  
  // Code Editor State
  const [codeContent, setCodeContent] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSideReviewPanel, setShowSideReviewPanel] = useState<boolean>(true);
  
  // PR Review State
  const [prResult, setPrResult] = useState<Record<string, PRResult | null>>({});
  const [isSubmittingPr, setIsSubmittingPr] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const fullscreenEditorRef = useRef<any>(null);

  // Fetch Tickets
  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/simulator/tickets/${profileId}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (data.length > 0 && !selectedTicket) {
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

  // Sync starter code whenever selected ticket changes
  useEffect(() => {
    if (selectedTicket) {
      setCodeContent(getStarterCodeForTicket(selectedTicket));
    }
  }, [selectedTicket?.id]);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedTicket?.id, persona]);

  const jumpToLine = (lineNumber: number, isFs: boolean = false) => {
    const targetEditor = isFs ? fullscreenEditorRef.current : editorRef.current;
    if (targetEditor && lineNumber > 0) {
      targetEditor.revealLineInCenter(lineNumber);
      targetEditor.setPosition({ lineNumber, column: 1 });
      targetEditor.focus();
    }
  };

  const sendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim() || !selectedTicket) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      persona: 'developer',
      text: textToSend,
      timestamp: new Date()
    };

    const currentTicketId = selectedTicket.id;
    const priorHistory = chatMessages[currentTicketId] || [];
    
    setChatMessages(prev => ({
      ...prev,
      [currentTicketId]: [...priorHistory, userMsg]
    }));
    
    if (!presetText) {
      setChatInput('');
    }
    setIsSendingChat(true);

    try {
      const res = await fetch(`http://localhost:8000/api/v1/simulator/ticket/${selectedTicket.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          message: userMsg.text,
          persona: persona,
          chat_history: priorHistory.map(m => ({ sender: m.sender, text: m.text, persona: m.persona })),
          ticket_context: {
            id: selectedTicket.id,
            title: selectedTicket.title,
            skill_id: selectedTicket.skill_id,
            description: selectedTicket.description,
            acceptance_criteria: selectedTicket.acceptance_criteria,
            affected_files: selectedTicket.affected_files
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          sender: 'ai',
          persona: data.persona || persona,
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
    if (!isFullscreen) {
      setActiveTab('review');
    }

    try {
      const res = await fetch(`http://localhost:8000/api/v1/simulator/ticket/${selectedTicket.id}/submit-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          code_content: codeContent,
          snapshots: [],
          ticket_context: {
            id: selectedTicket.id,
            title: selectedTicket.title,
            skill_id: selectedTicket.skill_id,
            description: selectedTicket.description,
            acceptance_criteria: selectedTicket.acceptance_criteria,
            affected_files: selectedTicket.affected_files
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPrResult(prev => ({
          ...prev,
          [selectedTicket.id]: data
        }));

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
    { title: 'Backlog', status: 'BACKLOG', color: 'border-aven-text/20 bg-aven-base text-aven-text-subtle' },
    { title: 'To Do', status: 'TODO', color: 'border-aven-text/20 bg-aven-base text-aven-text-subtle' },
    { title: 'In Progress', status: 'IN_PROGRESS', color: 'border-aven-text/20 bg-aven-base text-aven-text font-black' },
    { title: 'Under Review', status: 'UNDER_REVIEW', color: 'border-aven-text/20 bg-aven-base text-aven-text-subtle' },
    { title: 'Merged', status: 'MERGED', color: 'border-aven-text/20 bg-aven-base text-aven-text-subtle' }
  ];

  const currentLang = selectedTicket ? getLanguageForTicket(selectedTicket) : { language: 'python', extension: 'py', label: 'Python' };
  const currentPR = selectedTicket ? prResult[selectedTicket.id] : null;

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 text-aven-text">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-aven-primary p-6 rounded-xl shadow-lg border border-aven-primary">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/10 border border-white/20 text-aven-base text-[10px] font-black uppercase tracking-widest mb-3">
            <Briefcase size={14} className="text-aven-status-active" />
            Day-One Sandbox
          </div>
          <h1 className="text-2xl font-extrabold text-aven-base tracking-tight flex items-center gap-2 uppercase">
            <GitPullRequest className="text-aven-status-active" /> Enterprise Job Simulator
          </h1>
          <p className="text-sm text-aven-surface mt-1 font-medium">
            Pick up project tickets, gather requirements from stakeholders with RAG context, and submit PRs for code reviews.
          </p>
        </div>
        <button 
          onClick={fetchTickets}
          className="flex items-center gap-2 px-4 py-3 bg-aven-status-active hover:brightness-110 text-aven-text rounded-xl transition font-black uppercase tracking-widest text-xs shadow-md border border-aven-status-active"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Board
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Kanban Board Container (Left Column) */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-20 bg-aven-base/50 border border-aven-border rounded-xl h-96">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="animate-spin text-aven-text" size={32} />
                <span className="text-sm text-aven-text-subtle">Loading simulator dashboard...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {columns.map(col => {
                const colTickets = tickets.filter(t => t.status === col.status);
                return (
                  <div key={col.status} className="flex flex-col gap-3 min-h-[450px]">
                    <div className={`px-3 py-2 rounded border border-dashed flex justify-between items-center ${col.color}`}>
                      <span className="font-bold text-xs uppercase tracking-wider">{col.title}</span>
                      <span className="font-extrabold text-xs">{colTickets.length}</span>
                    </div>
                    
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-1">
                      {colTickets.length === 0 ? (
                        <div className="text-[10px] text-aven-text-subtle text-center py-8 border border-dashed border-aven-text/20 rounded-xl">
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
                                  ? 'bg-aven-surface border-aven-text/20 shadow-sm' 
                                  : 'bg-aven-base hover:bg-aven-surface border-aven-border/80'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-aven-base text-aven-text-subtle border border-aven-text/10' : 'bg-aven-surface text-aven-text-subtle'
                                }`}>
                                  {t.id}
                                </span>
                                <span className={`w-2 h-2 rounded-full ${
                                  t.status === 'MERGED' ? 'bg-emerald-400' :
                                  t.status === 'UNDER_REVIEW' ? 'bg-purple-400' :
                                  t.status === 'IN_PROGRESS' ? 'bg-amber-400' : 'bg-aven-border'
                                }`} />
                              </div>
                              <h3 className={`font-bold text-xs line-clamp-2 leading-snug ${
                                isSelected ? 'text-aven-text' : 'text-aven-text'
                              }`}>
                                {t.title}
                              </h3>
                              <div className="mt-3 flex flex-wrap gap-1">
                                <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded ${
                                  isSelected ? 'bg-aven-base text-aven-text border border-aven-text/10' : 'bg-aven-surface text-aven-text'
                                }`}>
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
        <div className="xl:col-span-1 bg-aven-base border border-aven-border rounded-xl shadow-lg flex flex-col overflow-hidden min-h-[620px]">
          {selectedTicket ? (
            <>
              <div className="p-8 flex flex-col items-center justify-center h-full">
                <div className="mb-10 flex flex-col items-center text-center gap-3">
                  <span className={`text-[10px] px-3 py-1 rounded font-black uppercase tracking-widest ${
                    selectedTicket.status === 'MERGED' ? 'bg-aven-text-subtle text-aven-base border border-aven-text' :
                    selectedTicket.status === 'UNDER_REVIEW' ? 'bg-aven-surface text-aven-text border border-aven-text/20' :
                    selectedTicket.status === 'IN_PROGRESS' ? 'bg-aven-text text-aven-base border border-aven-text' :
                    'bg-aven-surface text-aven-text-subtle border border-aven-text/20'
                  }`}>
                    {selectedTicket.status}
                  </span>
                  <h2 className="text-2xl font-black text-aven-text leading-tight max-w-md">{selectedTicket.title}</h2>
                  <p className="text-sm text-aven-text-subtle max-w-sm leading-relaxed">{selectedTicket.description.slice(0, 100)}...</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                  <button onClick={() => setActiveTab('requirements')} className="aspect-square flex flex-col items-center justify-center gap-4 bg-aven-surface hover:bg-aven-border hover:shadow-lg text-aven-text rounded-3xl border border-aven-text/20 shadow-md transition-all group">
                    <CheckSquare size={36} className="group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">Task Specs</span>
                  </button>
                  <button onClick={() => setActiveTab('chat')} className="aspect-square flex flex-col items-center justify-center gap-4 bg-aven-surface hover:bg-aven-border hover:shadow-lg text-aven-text rounded-3xl border border-aven-text/20 shadow-md transition-all group">
                    <MessageSquare size={36} className="group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">Slack Chat</span>
                  </button>
                  <button onClick={() => setIsFullscreen(true)} className="aspect-square flex flex-col items-center justify-center gap-4 bg-aven-surface hover:bg-aven-border hover:shadow-lg text-aven-text rounded-3xl border border-aven-text/20 shadow-md transition-all group">
                    <Code2 size={36} className="group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">IDE Editor</span>
                  </button>
                  <button onClick={() => setActiveTab('review')} className="aspect-square flex flex-col items-center justify-center gap-4 bg-aven-surface hover:bg-aven-border hover:shadow-lg text-aven-text rounded-3xl border border-aven-text/20 shadow-md transition-all group relative">
                    <GitPullRequest size={36} className="group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">PR Review</span>
                    {currentPR && (
                      <span className={`absolute top-4 right-4 text-[9px] px-2 py-0.5 rounded font-black tracking-widest ${
                        currentPR.approved ? 'bg-aven-text text-aven-base' : 'bg-aven-base text-aven-text border border-aven-text'
                      }`}>
                        {currentPR.approved ? '✓' : '!'}
                      </span>
                    )}
                  </button>
                </div>
              </div>

      {/* Centered Modals for Tools */}
      {(activeTab === 'requirements' || activeTab === 'chat' || activeTab === 'review') && selectedTicket && (
        <div className="fixed inset-0 z-[100] bg-aven-text/80 backdrop-blur-sm p-4 md:p-6 flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-aven-base rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-aven-text/20">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-aven-text/20 bg-aven-surface">
              <h3 className="font-black uppercase tracking-widest text-aven-text text-sm flex items-center gap-2">
                {activeTab === 'requirements' && <><CheckSquare size={16} /> Task Specifications</>}
                {activeTab === 'chat' && <><MessageSquare size={16} /> Stakeholder Slack Chat</>}
                {activeTab === 'review' && <><GitPullRequest size={16} /> Pull Request Review</>}
              </h3>
              <button 
                onClick={() => setActiveTab(null)} 
                className="p-2 bg-aven-border hover:bg-aven-text hover:text-aven-base rounded-xl text-aven-text transition shadow-sm"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Requirements Tab */}
                {activeTab === 'requirements' && (
                  <div className="flex flex-col gap-6 text-xs p-2">
                    <div>
                      <h4 className="font-black text-aven-text-subtle mb-2.5 uppercase tracking-widest text-[10px]">Description</h4>
                      <p className="text-aven-text-subtle leading-relaxed bg-aven-surface p-4 rounded-xl border border-aven-text/20 shadow-sm">
                        {selectedTicket.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-black text-aven-text-subtle mb-2.5 uppercase tracking-widest text-[10px]">Affected Workspace Files</h4>
                      <div className="flex flex-col gap-2">
                        {selectedTicket.affected_files.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-aven-base border border-aven-text/20 text-aven-text font-mono text-[11px] shadow-sm">
                            <FolderCode size={16} />
                            {file}
                            <span className="ml-auto text-[10px] text-aven-text-subtle uppercase font-sans font-black tracking-widest">
                              {currentLang.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-black text-aven-text-subtle mb-2.5 uppercase tracking-widest text-[10px]">Acceptance Criteria</h4>
                      <div className="flex flex-col gap-2.5">
                        {selectedTicket.acceptance_criteria.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3 bg-aven-base p-4 rounded-xl border border-aven-text/20 shadow-sm">
                            <CheckSquare className="text-aven-text shrink-0 mt-0.5" size={16} />
                            <span className="text-aven-text-subtle leading-relaxed text-[11px]">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Stakeholder Chat Tab */}
                {activeTab === 'chat' && (
                  <div className="flex flex-col h-[440px]">
                    {/* Persona Toggle */}
                    <div className="flex justify-between items-center bg-aven-base p-2 rounded-xl border border-aven-text/20 mb-2.5 text-xs">
                      <span className="text-aven-text-subtle font-black uppercase tracking-widest px-2 flex items-center gap-1.5">
                        <Users size={14} className="text-aven-text" /> Stakeholder Persona:
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPersona('pm')}
                          className={`px-3 py-1 rounded font-bold transition text-xs ${
                            persona === 'pm' ? 'bg-aven-text-subtle text-aven-base shadow-md' : 'text-aven-text-subtle hover:text-aven-text'
                          }`}
                        >
                          Product Manager
                        </button>
                        <button
                          onClick={() => setPersona('client')}
                          className={`px-3 py-1 rounded font-bold transition text-xs ${
                            persona === 'client' ? 'bg-aven-text-subtle text-aven-base shadow-md' : 'text-aven-text-subtle hover:text-aven-text'
                          }`}
                        >
                          Non-Tech Client
                        </button>
                      </div>
                    </div>

                    {/* Preset Question Chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <button
                        onClick={() => sendChatMessage("What is the core objective of this ticket?")}
                        className="text-[10px] px-2 py-1 bg-aven-base hover:bg-aven-surface text-aven-text border border-aven-text/20 rounded transition"
                      >
                        🎯 Core Goal?
                      </button>
                      <button
                        onClick={() => sendChatMessage("Are there any edge cases or validation rules I should handle?")}
                        className="text-[10px] px-2 py-1 bg-aven-base hover:bg-aven-surface text-aven-text border border-aven-text/20 rounded transition"
                      >
                        ⚠️ Edge Cases?
                      </button>
                      <button
                        onClick={() => sendChatMessage(persona === 'client' ? "Why is this feature important for the business?" : "What schema constraints should I follow?")}
                        className="text-[10px] px-2 py-1 bg-aven-base hover:bg-aven-surface text-aven-text border border-aven-text/20 rounded transition"
                      >
                        {persona === 'client' ? '💡 Business Value?' : '📐 Schema Rules?'}
                      </button>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 p-3 bg-aven-surface rounded-xl border border-slate-900 mb-2.5 text-xs">
                      <div className="p-2.5 bg-aven-surface border border-aven-border rounded-xl text-aven-text text-center leading-relaxed text-[11px]">
                        Slack channel for ticket <strong>#{selectedTicket.id}</strong> ({selectedTicket.title}). Ask {persona === 'pm' ? 'Alex (PM)' : 'Morgan (Client)'} anything!
                      </div>
                      
                      {(chatMessages[selectedTicket.id] || []).map((msg, index) => (
                        <div
                          key={index}
                          className={`flex flex-col max-w-[85%] rounded-xl p-3 leading-normal ${
                            msg.sender === 'user'
                              ? 'self-end bg-aven-text-subtle text-aven-base rounded-tr-none shadow-md'
                              : 'self-start bg-aven-base text-aven-text rounded-tl-none border border-aven-text/20/80'
                          }`}
                        >
                          <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider mb-1 flex items-center gap-1">
                            {msg.sender === 'user' ? 'You' : msg.persona.toUpperCase() === 'CLIENT' ? 'Morgan (Client)' : 'Alex (Product Manager)'}
                          </span>
                          <p className="leading-relaxed">{msg.text}</p>
                        </div>
                      ))}
                      {isSendingChat && (
                        <div className="self-start bg-aven-surface text-aven-text-subtle rounded-xl p-3 rounded-tl-none border border-aven-text/20 italic flex items-center gap-2">
                          <RefreshCw size={12} className="animate-spin text-aven-text" />
                          {persona === 'pm' ? 'Product Manager' : 'Client'} is typing...
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
                        placeholder={`Ask the ${persona === 'pm' ? 'Product Manager (Alex)' : 'Client (Morgan)'}...`}
                        className="flex-1 bg-aven-base border border-aven-text/20 rounded-xl px-3 py-2 text-xs text-aven-text focus:outline-none focus:border-aven-text transition"
                      />
                      <button
                        onClick={() => sendChatMessage()}
                        disabled={isSendingChat || !chatInput.trim()}
                        className="bg-aven-text-subtle hover:bg-aven-text disabled:opacity-50 text-aven-base p-2.5 rounded-xl transition flex items-center justify-center shrink-0 shadow-md"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}


                {/* PR Review Details Tab */}
                {activeTab === 'review' && (
                  <div className="flex flex-col gap-4 text-xs">
                    {isSubmittingPr ? (
                      <div className="flex flex-col items-center gap-3 py-16">
                        <RefreshCw className="animate-spin text-aven-text" size={32} />
                        <p className="text-aven-text-subtle text-center font-medium">
                          Running automated static analysis & invoking AI Senior Tech Lead review...
                        </p>
                      </div>
                    ) : currentPR ? (
                      <div className="flex flex-col gap-4">
                        {/* Approval Status Header */}
                        {currentPR.approved ? (
                          <div className="flex items-center gap-3 p-4 bg-aven-base border border-aven-text/20 rounded-xl text-aven-text">
                            <CheckCircle2 className="shrink-0 text-aven-text" size={20} />
                            <div>
                              <h4 className="font-bold text-aven-text text-xs">PR Approved & Merged!</h4>
                              <p className="text-[11px] text-aven-text-subtle mt-0.5">Telemetry analyzed. BKT mastery progress updated and roadmap advanced.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-aven-surface border border-aven-text rounded-xl text-aven-text">
                            <AlertCircle className="shrink-0 text-aven-text" size={20} />
                            <div>
                              <h4 className="font-bold text-aven-text text-xs">PR Changes Requested (Blockers Found)</h4>
                              <p className="text-[11px] text-aven-text-subtle mt-0.5">Please address the issues highlighted in the line comments below.</p>
                            </div>
                          </div>
                        )}

                        {/* General Feedback */}
                        <div>
                          <h4 className="font-bold text-aven-text-subtle mb-1.5 uppercase tracking-wider text-[10px]">General Feedback</h4>
                          <p className="bg-aven-base border border-aven-text/20 p-3.5 rounded-xl leading-relaxed text-aven-text-subtle">
                            {currentPR.general_feedback}
                          </p>
                        </div>

                        {/* Line Annotations */}
                        <div>
                          <h4 className="font-bold text-aven-text-subtle mb-2.5 uppercase tracking-wider text-[10px]">Line-by-Line Code Review</h4>
                          <div className="flex flex-col gap-2.5">
                            {currentPR.comments.map((comment, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => {
                                  setActiveTab(null);
                                  setIsFullscreen(true);
                                  setTimeout(() => jumpToLine(comment.line_number, false), 100);
                                }}
                                className="border border-aven-text/20 hover:border-aven-text/20 bg-aven-base hover:bg-aven-surface rounded-xl p-3.5 flex flex-col gap-1.5 transition cursor-pointer"
                                title="Click to jump to line in IDE"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-mono text-aven-text flex items-center gap-1.5">
                                    <FileCode size={12} />
                                    {comment.file_path} : Line {comment.line_number}
                                  </span>
                                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                    comment.severity === 'BLOCKER' ? 'bg-aven-base text-aven-text border border-aven-text' :
                                    comment.severity === 'SUGGESTION' ? 'bg-aven-base text-aven-text border border-aven-text' :
                                    'bg-aven-base text-aven-text border border-aven-text'
                                  }`}>
                                    {comment.severity}
                                  </span>
                                </div>
                                <p className="text-aven-text-subtle leading-normal">{comment.comment}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {!currentPR.approved && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setActiveTab(null);
                                setIsFullscreen(true);
                              }}
                              className="flex-1 py-2.5 bg-aven-text-subtle hover:bg-aven-text text-aven-base rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md"
                            >
                              <Maximize2 size={14} /> Fix in Fullscreen
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-aven-text-subtle flex flex-col items-center gap-2">
                        <Code2 size={32} className="text-aven-text-subtle" />
                        <p>No active PR submissions. Head to the IDE Editor tab to write code and open a PR.</p>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-aven-text-subtle gap-4 h-full">
              <Briefcase size={48} className="text-aven-text-subtle opacity-50" />
              <p className="font-black text-lg uppercase tracking-widest text-aven-text">Select a ticket</p>
              <p className="text-sm max-w-xs leading-relaxed text-aven-text-subtle">
                Click any ticket in the Kanban board to view the control hub, consult stakeholders, and write code.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Fullscreen Mode Modal with Side-by-Side PR Review Inspector */}
      {isFullscreen && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-aven-base/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200">
          {/* Fullscreen Header Bar */}
          <div className="flex justify-between items-center bg-aven-base border border-aven-text/20 px-6 py-3.5 rounded-xl shadow-xl mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-aven-text bg-aven-surface px-2.5 py-1 rounded border border-indigo-800/40">
                {selectedTicket.id}
              </span>
              <span className="font-bold text-sm text-aven-text">{selectedTicket.title}</span>
              <span className="text-xs text-aven-text-subtle font-mono bg-aven-surface px-2.5 py-1 rounded border border-aven-text/20 flex items-center gap-1.5">
                <FileCode size={13} className="text-aven-text" />
                {selectedTicket.affected_files[0]} ({currentLang.label})
              </span>
              {currentPR && (
                <span className={`text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1.5 ${
                  currentPR.approved 
                    ? 'bg-aven-base text-aven-text border border-aven-text' 
                    : 'bg-aven-base text-aven-text border border-aven-text'
                }`}>
                  {currentPR.approved ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {currentPR.approved ? 'PR Merged' : `${currentPR.comments.length} Changes Requested`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSideReviewPanel(!showSideReviewPanel)}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition flex items-center gap-1.5 ${
                  showSideReviewPanel 
                    ? 'bg-aven-surface border-aven-text text-aven-text' 
                    : 'bg-aven-surface border-aven-text/20 text-aven-text-subtle hover:text-aven-text'
                }`}
                title="Toggle PR Review Side Panel"
              >
                {showSideReviewPanel ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                PR Review Panel
              </button>

              <button
                onClick={submitPullRequest}
                disabled={isSubmittingPr}
                className="px-5 py-2.5 bg-aven-text-subtle hover:bg-aven-text text-aven-base rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-sm disabled:opacity-50"
              >
                <GitPullRequest size={14} />
                {isSubmittingPr ? 'Submitting...' : 'Submit Pull Request (Open PR)'}
              </button>

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2.5 rounded-xl bg-aven-surface hover:bg-aven-border text-aven-text-subtle hover:text-aven-text transition"
                title="Exit Fullscreen"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Fullscreen Body Grid: Specs Drawer (Left) | Monaco Editor (Center) | PR Code Review Inspector (Right) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
            {/* Left Specs Drawer (3 cols) */}
            <div className="lg:col-span-3 bg-aven-base border border-aven-text/20 rounded-xl p-5 overflow-y-auto text-xs flex flex-col gap-4 shadow-xl">
              <div>
                <h4 className="font-bold text-aven-text-subtle uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                  <CheckSquare size={13} className="text-aven-text" /> Acceptance Criteria
                </h4>
                <div className="flex flex-col gap-2">
                  {selectedTicket.acceptance_criteria.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 bg-aven-base p-2.5 rounded-xl border border-aven-text/20">
                      <CheckSquare className="text-aven-text shrink-0 mt-0.5" size={14} />
                      <span className="text-aven-text-subtle leading-snug">{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-aven-text-subtle uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                  <FolderCode size={13} className="text-aven-text" /> Task Description
                </h4>
                <p className="text-aven-text-subtle leading-relaxed bg-aven-base p-3 rounded-xl border border-aven-text/20">
                  {selectedTicket.description}
                </p>
              </div>
            </div>

            {/* Center Monaco Editor (6 cols if right panel shown, 9 cols if hidden) */}
            <div className={`${showSideReviewPanel ? 'lg:col-span-6' : 'lg:col-span-9'} bg-aven-base border border-aven-text/20 rounded-xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300`}>
              <div className="flex items-center justify-between px-4 py-2 bg-aven-base border-b border-aven-text/20 text-[11px] text-aven-text-subtle font-mono">
                <span>{selectedTicket.affected_files[0]}</span>
                <span className="text-[10px] text-aven-text font-bold uppercase">{currentLang.label}</span>
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={currentLang.language}
                  value={codeContent}
                  onMount={(ed) => { fullscreenEditorRef.current = ed; }}
                  onChange={(val) => setCodeContent(val || '')}
                  theme="vs-dark"
                  options={{
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    padding: { top: 12, bottom: 12 }
                  }}
                />
              </div>
            </div>

            {/* Right PR Code Review & Change Request Panel (3 cols) */}
            {showSideReviewPanel && (
              <div className="lg:col-span-3 bg-aven-base border border-aven-text/20 rounded-xl p-5 overflow-y-auto text-xs flex flex-col gap-4 shadow-xl animate-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between border-b border-aven-text/20 pb-3">
                  <h3 className="font-extrabold text-aven-text text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <GitPullRequest size={14} className="text-aven-text" /> PR Code Review
                  </h3>
                  {currentPR && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      currentPR.approved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {currentPR.approved ? 'Approved' : 'Changes Requested'}
                    </span>
                  )}
                </div>

                {isSubmittingPr ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <RefreshCw className="animate-spin text-aven-text" size={28} />
                    <p className="text-aven-text-subtle text-xs">Analyzing code against acceptance criteria...</p>
                  </div>
                ) : currentPR ? (
                  <div className="flex flex-col gap-4">
                    {/* General Feedback Box */}
                    <div>
                      <h4 className="font-bold text-aven-text-subtle mb-1.5 uppercase tracking-wider text-[10px]">Feedback Summary</h4>
                      <p className="bg-aven-base/80 border border-aven-text/20 p-3 rounded-xl leading-relaxed text-aven-text-subtle text-[11px]">
                        {currentPR.general_feedback}
                      </p>
                    </div>

                    {/* Line-by-Line Changes to Fix */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-aven-text-subtle uppercase tracking-wider text-[10px]">
                          Line Changes to Fix ({currentPR.comments.length})
                        </h4>
                        <span className="text-[10px] text-aven-text-subtle">Click to jump to line</span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {currentPR.comments.map((comment, idx) => (
                          <div
                            key={idx}
                            onClick={() => jumpToLine(comment.line_number, true)}
                            className={`border rounded-xl p-3 flex flex-col gap-1.5 transition cursor-pointer ${
                              comment.severity === 'BLOCKER' 
                                ? 'bg-aven-surface border border-aven-text/20 hover:bg-red-950/40 hover:border-red-500/70 shadow-sm' 
                                : comment.severity === 'SUGGESTION'
                                ? 'bg-aven-surface border border-aven-text/20 hover:bg-amber-950/40 hover:border-amber-500/70 shadow-sm'
                                : 'bg-aven-base/80 border-aven-text/20 hover:border-aven-text/20'
                            }`}
                            title={`Jump to line ${comment.line_number} in editor`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-aven-text font-bold flex items-center gap-1">
                                <FileCode size={12} /> Line {comment.line_number}
                              </span>
                              <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                comment.severity === 'BLOCKER' ? 'bg-red-500/20 text-red-400' :
                                comment.severity === 'SUGGESTION' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {comment.severity}
                              </span>
                            </div>
                            <p className="text-aven-text-subtle leading-snug text-[11px]">{comment.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-aven-text-subtle">
                    <Code2 size={32} className="text-aven-text-subtle" />
                    <p className="text-xs">No PR submitted yet.</p>
                    <p className="text-[11px] text-aven-text-subtle max-w-[200px]">
                      Click &quot;Submit Pull Request&quot; above to run static analysis and get line annotations here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
