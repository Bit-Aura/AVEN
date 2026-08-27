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
    { title: 'Backlog', status: 'BACKLOG', color: 'border-[#141413]/20 bg-[#faf9f5] text-[#3d3d3a]' },
    { title: 'To Do', status: 'TODO', color: 'border-[#141413]/20 bg-[#faf9f5] text-[#3d3d3a]' },
    { title: 'In Progress', status: 'IN_PROGRESS', color: 'border-[#141413]/20 bg-[#faf9f5] text-[#141413] font-black' },
    { title: 'Under Review', status: 'UNDER_REVIEW', color: 'border-[#141413]/20 bg-[#faf9f5] text-[#3d3d3a]' },
    { title: 'Merged', status: 'MERGED', color: 'border-[#141413]/20 bg-[#faf9f5] text-[#3d3d3a]' }
  ];

  const currentLang = selectedTicket ? getLanguageForTicket(selectedTicket) : { language: 'python', extension: 'py', label: 'Python' };
  const currentPR = selectedTicket ? prResult[selectedTicket.id] : null;

  return (
    <div className="flex flex-col gap-6 min-h-screen pb-24 text-[#141413]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#faf9f5] p-6 rounded-xl border border-[#d6d3c4] shadow-md">
        <div>
          <h1 className="text-2xl font-extrabold text-[#141413] tracking-tight flex items-center gap-2">
            <GitPullRequest className="text-[#141413]" /> Day-One Simulator Workspace
          </h1>
          <p className="text-sm text-[#3d3d3a] mt-1">
            Pick up project tickets, gather requirements from stakeholders with RAG context, and submit PRs for code reviews.
          </p>
        </div>
        <button 
          onClick={fetchTickets}
          className="flex items-center gap-2 px-4 py-2 bg-[#e8e6dc] hover:bg-[#d6d3c4] text-[#141413] rounded-xl border border-[#141413]/20 transition font-black uppercase tracking-widest text-xs shadow-sm"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Board
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Kanban Board Container (Left Column) */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-20 bg-[#faf9f5]/50 border border-[#d6d3c4] rounded-xl h-96">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="animate-spin text-[#141413]" size={32} />
                <span className="text-sm text-[#3d3d3a]">Loading simulator dashboard...</span>
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
                        <div className="text-[10px] text-[#3d3d3a] text-center py-8 border border-dashed border-[#141413]/20 rounded-xl">
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
                                  ? 'bg-[#e8e6dc] border-[#141413]/20 shadow-sm' 
                                  : 'bg-[#faf9f5] hover:bg-[#e8e6dc] border-[#d6d3c4]/80'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-[#faf9f5] text-[#3d3d3a] border border-[#141413]/10' : 'bg-[#e8e6dc] text-[#3d3d3a]'
                                }`}>
                                  {t.id}
                                </span>
                                <span className={`w-2 h-2 rounded-full ${
                                  t.status === 'MERGED' ? 'bg-emerald-400' :
                                  t.status === 'UNDER_REVIEW' ? 'bg-purple-400' :
                                  t.status === 'IN_PROGRESS' ? 'bg-amber-400' : 'bg-[#d6d3c4]'
                                }`} />
                              </div>
                              <h3 className={`font-bold text-xs line-clamp-2 leading-snug ${
                                isSelected ? 'text-[#141413]' : 'text-[#141413]'
                              }`}>
                                {t.title}
                              </h3>
                              <div className="mt-3 flex flex-wrap gap-1">
                                <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded ${
                                  isSelected ? 'bg-[#faf9f5] text-[#141413] border border-[#141413]/10' : 'bg-[#e8e6dc] text-[#141413]'
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
        <div className="xl:col-span-1 bg-[#faf9f5] border border-[#d6d3c4] rounded-xl shadow-lg flex flex-col overflow-hidden min-h-[620px]">
          {selectedTicket ? (
            <>
              <div className="p-8 flex flex-col items-center justify-center h-full">
                <div className="mb-10 flex flex-col items-center text-center gap-3">
                  <span className={`text-[10px] px-3 py-1 rounded font-black uppercase tracking-widest ${
                    selectedTicket.status === 'MERGED' ? 'bg-[#3d3d3a] text-[#faf9f5] border border-[#141413]' :
                    selectedTicket.status === 'UNDER_REVIEW' ? 'bg-[#e8e6dc] text-[#141413] border border-[#141413]/20' :
                    selectedTicket.status === 'IN_PROGRESS' ? 'bg-[#141413] text-[#faf9f5] border border-[#141413]' :
                    'bg-[#e8e6dc] text-[#3d3d3a] border border-[#141413]/20'
                  }`}>
                    {selectedTicket.status}
                  </span>
                  <h2 className="text-2xl font-black text-[#141413] leading-tight max-w-md">{selectedTicket.title}</h2>
                  <p className="text-sm text-[#3d3d3a] max-w-sm leading-relaxed">{selectedTicket.description.slice(0, 100)}...</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                  <button onClick={() => setActiveTab('requirements')} className="aspect-square flex flex-col items-center justify-center gap-4 bg-[#e8e6dc] hover:bg-[#d6d3c4] hover:shadow-lg text-[#141413] rounded-3xl border border-[#141413]/20 shadow-md transition-all group">
                    <CheckSquare size={36} className="group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">Task Specs</span>
                  </button>
                  <button onClick={() => setActiveTab('chat')} className="aspect-square flex flex-col items-center justify-center gap-4 bg-[#e8e6dc] hover:bg-[#d6d3c4] hover:shadow-lg text-[#141413] rounded-3xl border border-[#141413]/20 shadow-md transition-all group">
                    <MessageSquare size={36} className="group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">Slack Chat</span>
                  </button>
                  <button onClick={() => setIsFullscreen(true)} className="aspect-square flex flex-col items-center justify-center gap-4 bg-[#e8e6dc] hover:bg-[#d6d3c4] hover:shadow-lg text-[#141413] rounded-3xl border border-[#141413]/20 shadow-md transition-all group">
                    <Code2 size={36} className="group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">IDE Editor</span>
                  </button>
                  <button onClick={() => setActiveTab('review')} className="aspect-square flex flex-col items-center justify-center gap-4 bg-[#e8e6dc] hover:bg-[#d6d3c4] hover:shadow-lg text-[#141413] rounded-3xl border border-[#141413]/20 shadow-md transition-all group relative">
                    <GitPullRequest size={36} className="group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">PR Review</span>
                    {currentPR && (
                      <span className={`absolute top-4 right-4 text-[9px] px-2 py-0.5 rounded font-black tracking-widest ${
                        currentPR.approved ? 'bg-[#141413] text-[#faf9f5]' : 'bg-[#faf9f5] text-[#141413] border border-[#141413]'
                      }`}>
                        {currentPR.approved ? '✓' : '!'}
                      </span>
                    )}
                  </button>
                </div>
              </div>

      {/* Centered Modals for Tools */}
      {(activeTab === 'requirements' || activeTab === 'chat' || activeTab === 'review') && selectedTicket && (
        <div className="fixed inset-0 z-[100] bg-[#141413]/80 backdrop-blur-sm p-4 md:p-6 flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#faf9f5] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#141413]/20">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#141413]/20 bg-[#e8e6dc]">
              <h3 className="font-black uppercase tracking-widest text-[#141413] text-sm flex items-center gap-2">
                {activeTab === 'requirements' && <><CheckSquare size={16} /> Task Specifications</>}
                {activeTab === 'chat' && <><MessageSquare size={16} /> Stakeholder Slack Chat</>}
                {activeTab === 'review' && <><GitPullRequest size={16} /> Pull Request Review</>}
              </h3>
              <button 
                onClick={() => setActiveTab(null)} 
                className="p-2 bg-[#d6d3c4] hover:bg-[#141413] hover:text-[#faf9f5] rounded-xl text-[#141413] transition shadow-sm"
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
                      <h4 className="font-black text-[#3d3d3a] mb-2.5 uppercase tracking-widest text-[10px]">Description</h4>
                      <p className="text-[#3d3d3a] leading-relaxed bg-[#e8e6dc] p-4 rounded-xl border border-[#141413]/20 shadow-sm">
                        {selectedTicket.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-black text-[#3d3d3a] mb-2.5 uppercase tracking-widest text-[10px]">Affected Workspace Files</h4>
                      <div className="flex flex-col gap-2">
                        {selectedTicket.affected_files.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#faf9f5] border border-[#141413]/20 text-[#141413] font-mono text-[11px] shadow-sm">
                            <FolderCode size={16} />
                            {file}
                            <span className="ml-auto text-[10px] text-[#3d3d3a] uppercase font-sans font-black tracking-widest">
                              {currentLang.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-black text-[#3d3d3a] mb-2.5 uppercase tracking-widest text-[10px]">Acceptance Criteria</h4>
                      <div className="flex flex-col gap-2.5">
                        {selectedTicket.acceptance_criteria.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3 bg-[#faf9f5] p-4 rounded-xl border border-[#141413]/20 shadow-sm">
                            <CheckSquare className="text-[#141413] shrink-0 mt-0.5" size={16} />
                            <span className="text-[#3d3d3a] leading-relaxed text-[11px]">{item}</span>
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
                    <div className="flex justify-between items-center bg-[#faf9f5] p-2 rounded-xl border border-[#141413]/20 mb-2.5 text-xs">
                      <span className="text-[#3d3d3a] font-black uppercase tracking-widest px-2 flex items-center gap-1.5">
                        <Users size={14} className="text-[#141413]" /> Stakeholder Persona:
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPersona('pm')}
                          className={`px-3 py-1 rounded font-bold transition text-xs ${
                            persona === 'pm' ? 'bg-[#3d3d3a] text-[#faf9f5] shadow-md' : 'text-[#3d3d3a] hover:text-[#141413]'
                          }`}
                        >
                          Product Manager
                        </button>
                        <button
                          onClick={() => setPersona('client')}
                          className={`px-3 py-1 rounded font-bold transition text-xs ${
                            persona === 'client' ? 'bg-[#3d3d3a] text-[#faf9f5] shadow-md' : 'text-[#3d3d3a] hover:text-[#141413]'
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
                        className="text-[10px] px-2 py-1 bg-[#faf9f5] hover:bg-[#e8e6dc] text-[#141413] border border-[#141413]/20 rounded transition"
                      >
                        🎯 Core Goal?
                      </button>
                      <button
                        onClick={() => sendChatMessage("Are there any edge cases or validation rules I should handle?")}
                        className="text-[10px] px-2 py-1 bg-[#faf9f5] hover:bg-[#e8e6dc] text-[#141413] border border-[#141413]/20 rounded transition"
                      >
                        ⚠️ Edge Cases?
                      </button>
                      <button
                        onClick={() => sendChatMessage(persona === 'client' ? "Why is this feature important for the business?" : "What schema constraints should I follow?")}
                        className="text-[10px] px-2 py-1 bg-[#faf9f5] hover:bg-[#e8e6dc] text-[#141413] border border-[#141413]/20 rounded transition"
                      >
                        {persona === 'client' ? '💡 Business Value?' : '📐 Schema Rules?'}
                      </button>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 p-3 bg-[#e8e6dc] rounded-xl border border-slate-900 mb-2.5 text-xs">
                      <div className="p-2.5 bg-[#e8e6dc] border border-[#d6d3c4] rounded-xl text-[#141413] text-center leading-relaxed text-[11px]">
                        Slack channel for ticket <strong>#{selectedTicket.id}</strong> ({selectedTicket.title}). Ask {persona === 'pm' ? 'Alex (PM)' : 'Morgan (Client)'} anything!
                      </div>
                      
                      {(chatMessages[selectedTicket.id] || []).map((msg, index) => (
                        <div
                          key={index}
                          className={`flex flex-col max-w-[85%] rounded-xl p-3 leading-normal ${
                            msg.sender === 'user'
                              ? 'self-end bg-[#3d3d3a] text-[#faf9f5] rounded-tr-none shadow-md'
                              : 'self-start bg-[#faf9f5] text-[#141413] rounded-tl-none border border-[#141413]/20/80'
                          }`}
                        >
                          <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider mb-1 flex items-center gap-1">
                            {msg.sender === 'user' ? 'You' : msg.persona.toUpperCase() === 'CLIENT' ? 'Morgan (Client)' : 'Alex (Product Manager)'}
                          </span>
                          <p className="leading-relaxed">{msg.text}</p>
                        </div>
                      ))}
                      {isSendingChat && (
                        <div className="self-start bg-[#e8e6dc] text-[#3d3d3a] rounded-xl p-3 rounded-tl-none border border-[#141413]/20 italic flex items-center gap-2">
                          <RefreshCw size={12} className="animate-spin text-[#141413]" />
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
                        className="flex-1 bg-[#faf9f5] border border-[#141413]/20 rounded-xl px-3 py-2 text-xs text-[#141413] focus:outline-none focus:border-[#141413] transition"
                      />
                      <button
                        onClick={() => sendChatMessage()}
                        disabled={isSendingChat || !chatInput.trim()}
                        className="bg-[#3d3d3a] hover:bg-[#141413] disabled:opacity-50 text-[#faf9f5] p-2.5 rounded-xl transition flex items-center justify-center shrink-0 shadow-md"
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
                        <RefreshCw className="animate-spin text-[#141413]" size={32} />
                        <p className="text-[#3d3d3a] text-center font-medium">
                          Running automated static analysis & invoking AI Senior Tech Lead review...
                        </p>
                      </div>
                    ) : currentPR ? (
                      <div className="flex flex-col gap-4">
                        {/* Approval Status Header */}
                        {currentPR.approved ? (
                          <div className="flex items-center gap-3 p-4 bg-[#faf9f5] border border-[#141413]/20 rounded-xl text-[#141413]">
                            <CheckCircle2 className="shrink-0 text-[#141413]" size={20} />
                            <div>
                              <h4 className="font-bold text-[#141413] text-xs">PR Approved & Merged!</h4>
                              <p className="text-[11px] text-[#3d3d3a] mt-0.5">Telemetry analyzed. BKT mastery progress updated and roadmap advanced.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-[#e8e6dc] border border-[#141413] rounded-xl text-[#141413]">
                            <AlertCircle className="shrink-0 text-[#141413]" size={20} />
                            <div>
                              <h4 className="font-bold text-[#141413] text-xs">PR Changes Requested (Blockers Found)</h4>
                              <p className="text-[11px] text-[#3d3d3a] mt-0.5">Please address the issues highlighted in the line comments below.</p>
                            </div>
                          </div>
                        )}

                        {/* General Feedback */}
                        <div>
                          <h4 className="font-bold text-[#3d3d3a] mb-1.5 uppercase tracking-wider text-[10px]">General Feedback</h4>
                          <p className="bg-[#faf9f5] border border-[#141413]/20 p-3.5 rounded-xl leading-relaxed text-[#3d3d3a]">
                            {currentPR.general_feedback}
                          </p>
                        </div>

                        {/* Line Annotations */}
                        <div>
                          <h4 className="font-bold text-[#3d3d3a] mb-2.5 uppercase tracking-wider text-[10px]">Line-by-Line Code Review</h4>
                          <div className="flex flex-col gap-2.5">
                            {currentPR.comments.map((comment, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => {
                                  setActiveTab(null);
                                  setIsFullscreen(true);
                                  setTimeout(() => jumpToLine(comment.line_number, false), 100);
                                }}
                                className="border border-[#141413]/20 hover:border-[#141413]/20 bg-[#faf9f5] hover:bg-[#e8e6dc] rounded-xl p-3.5 flex flex-col gap-1.5 transition cursor-pointer"
                                title="Click to jump to line in IDE"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-mono text-[#141413] flex items-center gap-1.5">
                                    <FileCode size={12} />
                                    {comment.file_path} : Line {comment.line_number}
                                  </span>
                                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                    comment.severity === 'BLOCKER' ? 'bg-[#faf9f5] text-[#141413] border border-[#141413]' :
                                    comment.severity === 'SUGGESTION' ? 'bg-[#faf9f5] text-[#141413] border border-[#141413]' :
                                    'bg-[#faf9f5] text-[#141413] border border-[#141413]'
                                  }`}>
                                    {comment.severity}
                                  </span>
                                </div>
                                <p className="text-[#3d3d3a] leading-normal">{comment.comment}</p>
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
                              className="flex-1 py-2.5 bg-[#3d3d3a] hover:bg-[#141413] text-[#faf9f5] rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md"
                            >
                              <Maximize2 size={14} /> Fix in Fullscreen
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-[#3d3d3a] flex flex-col items-center gap-2">
                        <Code2 size={32} className="text-[#3d3d3a]" />
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
            <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-[#3d3d3a] gap-4 h-full">
              <Briefcase size={48} className="text-[#3d3d3a] opacity-50" />
              <p className="font-black text-lg uppercase tracking-widest text-[#141413]">Select a ticket</p>
              <p className="text-sm max-w-xs leading-relaxed text-[#3d3d3a]">
                Click any ticket in the Kanban board to view the control hub, consult stakeholders, and write code.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Fullscreen Mode Modal with Side-by-Side PR Review Inspector */}
      {isFullscreen && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-[#faf9f5]/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-200">
          {/* Fullscreen Header Bar */}
          <div className="flex justify-between items-center bg-[#faf9f5] border border-[#141413]/20 px-6 py-3.5 rounded-xl shadow-xl mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-[#141413] bg-[#e8e6dc] px-2.5 py-1 rounded border border-indigo-800/40">
                {selectedTicket.id}
              </span>
              <span className="font-bold text-sm text-[#141413]">{selectedTicket.title}</span>
              <span className="text-xs text-[#3d3d3a] font-mono bg-[#e8e6dc] px-2.5 py-1 rounded border border-[#141413]/20 flex items-center gap-1.5">
                <FileCode size={13} className="text-[#141413]" />
                {selectedTicket.affected_files[0]} ({currentLang.label})
              </span>
              {currentPR && (
                <span className={`text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1.5 ${
                  currentPR.approved 
                    ? 'bg-[#faf9f5] text-[#141413] border border-[#141413]' 
                    : 'bg-[#faf9f5] text-[#141413] border border-[#141413]'
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
                    ? 'bg-[#e8e6dc] border-[#141413] text-[#141413]' 
                    : 'bg-[#e8e6dc] border-[#141413]/20 text-[#3d3d3a] hover:text-[#141413]'
                }`}
                title="Toggle PR Review Side Panel"
              >
                {showSideReviewPanel ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                PR Review Panel
              </button>

              <button
                onClick={submitPullRequest}
                disabled={isSubmittingPr}
                className="px-5 py-2.5 bg-[#3d3d3a] hover:bg-[#141413] text-[#faf9f5] rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-sm disabled:opacity-50"
              >
                <GitPullRequest size={14} />
                {isSubmittingPr ? 'Submitting...' : 'Submit Pull Request (Open PR)'}
              </button>

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2.5 rounded-xl bg-[#e8e6dc] hover:bg-[#d6d3c4] text-[#3d3d3a] hover:text-[#141413] transition"
                title="Exit Fullscreen"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Fullscreen Body Grid: Specs Drawer (Left) | Monaco Editor (Center) | PR Code Review Inspector (Right) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
            {/* Left Specs Drawer (3 cols) */}
            <div className="lg:col-span-3 bg-[#faf9f5] border border-[#141413]/20 rounded-xl p-5 overflow-y-auto text-xs flex flex-col gap-4 shadow-xl">
              <div>
                <h4 className="font-bold text-[#3d3d3a] uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                  <CheckSquare size={13} className="text-[#141413]" /> Acceptance Criteria
                </h4>
                <div className="flex flex-col gap-2">
                  {selectedTicket.acceptance_criteria.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 bg-[#faf9f5] p-2.5 rounded-xl border border-[#141413]/20">
                      <CheckSquare className="text-[#141413] shrink-0 mt-0.5" size={14} />
                      <span className="text-[#3d3d3a] leading-snug">{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#3d3d3a] uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                  <FolderCode size={13} className="text-[#141413]" /> Task Description
                </h4>
                <p className="text-[#3d3d3a] leading-relaxed bg-[#faf9f5] p-3 rounded-xl border border-[#141413]/20">
                  {selectedTicket.description}
                </p>
              </div>
            </div>

            {/* Center Monaco Editor (6 cols if right panel shown, 9 cols if hidden) */}
            <div className={`${showSideReviewPanel ? 'lg:col-span-6' : 'lg:col-span-9'} bg-[#faf9f5] border border-[#141413]/20 rounded-xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300`}>
              <div className="flex items-center justify-between px-4 py-2 bg-[#faf9f5] border-b border-[#141413]/20 text-[11px] text-[#3d3d3a] font-mono">
                <span>{selectedTicket.affected_files[0]}</span>
                <span className="text-[10px] text-[#141413] font-bold uppercase">{currentLang.label}</span>
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
              <div className="lg:col-span-3 bg-[#faf9f5] border border-[#141413]/20 rounded-xl p-5 overflow-y-auto text-xs flex flex-col gap-4 shadow-xl animate-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between border-b border-[#141413]/20 pb-3">
                  <h3 className="font-extrabold text-[#141413] text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <GitPullRequest size={14} className="text-[#141413]" /> PR Code Review
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
                    <RefreshCw className="animate-spin text-[#141413]" size={28} />
                    <p className="text-[#3d3d3a] text-xs">Analyzing code against acceptance criteria...</p>
                  </div>
                ) : currentPR ? (
                  <div className="flex flex-col gap-4">
                    {/* General Feedback Box */}
                    <div>
                      <h4 className="font-bold text-[#3d3d3a] mb-1.5 uppercase tracking-wider text-[10px]">Feedback Summary</h4>
                      <p className="bg-[#faf9f5]/80 border border-[#141413]/20 p-3 rounded-xl leading-relaxed text-[#3d3d3a] text-[11px]">
                        {currentPR.general_feedback}
                      </p>
                    </div>

                    {/* Line-by-Line Changes to Fix */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-[#3d3d3a] uppercase tracking-wider text-[10px]">
                          Line Changes to Fix ({currentPR.comments.length})
                        </h4>
                        <span className="text-[10px] text-[#3d3d3a]">Click to jump to line</span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {currentPR.comments.map((comment, idx) => (
                          <div
                            key={idx}
                            onClick={() => jumpToLine(comment.line_number, true)}
                            className={`border rounded-xl p-3 flex flex-col gap-1.5 transition cursor-pointer ${
                              comment.severity === 'BLOCKER' 
                                ? 'bg-[#e8e6dc] border border-[#141413]/20 hover:bg-red-950/40 hover:border-red-500/70 shadow-sm' 
                                : comment.severity === 'SUGGESTION'
                                ? 'bg-[#e8e6dc] border border-[#141413]/20 hover:bg-amber-950/40 hover:border-amber-500/70 shadow-sm'
                                : 'bg-[#faf9f5]/80 border-[#141413]/20 hover:border-[#141413]/20'
                            }`}
                            title={`Jump to line ${comment.line_number} in editor`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-[#141413] font-bold flex items-center gap-1">
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
                            <p className="text-[#3d3d3a] leading-snug text-[11px]">{comment.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-[#3d3d3a]">
                    <Code2 size={32} className="text-[#3d3d3a]" />
                    <p className="text-xs">No PR submitted yet.</p>
                    <p className="text-[11px] text-[#3d3d3a] max-w-[200px]">
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
