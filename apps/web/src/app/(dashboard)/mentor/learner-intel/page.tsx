'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BrainCircuit,
  Network,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Target,
  Compass,
  Lightbulb,
  Activity,
  Layers,
  Video,
  Calendar,
  UserCheck,
  Loader2,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import {
  fetchOpenMentorRequests,
  fetchMentorAssignedSessions,
  fetchLearnerIntel,
  fetchMentorLearners,
  acceptMentorRequest,
} from '../../../../api/client';
import JitsiMeetingModal from '../../../../components/mentor/JitsiMeetingModal';
import SessionScheduleDialog from '../../../../components/mentor/SessionScheduleDialog';
import CompleteSessionDialog from '../../../../components/mentor/CompleteSessionDialog';

/**
 * Enterprise-grade implementation of LearnerIntelContent.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
function LearnerIntelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const profileIdParam = searchParams.get('profile_id');

  // Learner Directory State
  const [learnersList, setLearnersList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    profileIdParam ? Number(profileIdParam) : null
  );
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);

  // Selected Learner 360 Intel State
  const [learnerIntel, setLearnerIntel] = useState<any | null>(null);
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'brief' | 'activity'>('graph');

  // Meeting & Actions State
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [activeMeetingSession, setActiveMeetingSession] = useState<any | null>(null);
  const [schedulingSession, setSchedulingSession] = useState<any | null>(null);
  const [completingSession, setCompletingSession] = useState<any | null>(null);

  // Auto-dismiss Toast
  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  // Load All Real Active Learners from DB
  const loadLearnersDirectory = useCallback(async () => {
    setIsLoadingDirectory(true);
    try {
      const [allLearnersRes, openRes, sessionsRes] = await Promise.all([
        fetchMentorLearners().catch(() => ({ learners: [] })),
        fetchOpenMentorRequests().catch(() => ({ requests: [] })),
        fetchMentorAssignedSessions().catch(() => ({ sessions: [] })),
      ]);

      const dbLearners = allLearnersRes?.learners || [];
      const openReqs = openRes?.requests || [];
      const assigned = sessionsRes?.sessions || [];

      // Consolidate unique learners
      const directoryMap = new Map<number, any>();

      // 1. Add all enrolled learners from database
      dbLearners.forEach((l: any) => {
        directoryMap.set(l.profile_id, {
          profile_id: l.profile_id,
          name: l.name,
          email: l.email,
          target_role: l.target_role,
          readiness_pct: l.readiness_pct,
          status: l.status,
          active_topic: l.open_request_title,
          reason: l.open_request_reason,
          request_id: l.open_request_id,
        });
      });

      // 2. Augment with active open requests
      openReqs.forEach((r: any) => {
        const pId = r.profile_id;
        if (pId) {
          const existing = directoryMap.get(pId) || {};
          directoryMap.set(pId, {
            ...existing,
            profile_id: pId,
            name: r.learner_name || existing.name,
            email: r.learner_email || existing.email,
            target_role: r.target_role || existing.target_role || 'Software Engineering',
            status: 'OPEN_REQUEST',
            active_topic: r.title,
            reason: r.reason,
            skill_id: r.skill_id,
            request_id: r.id,
            request_obj: r,
          });
        }
      });

      // 3. Augment with assigned sessions
      assigned.forEach((s: any) => {
        const pId = s.profile_id;
        if (pId) {
          const existing = directoryMap.get(pId) || {};
          directoryMap.set(pId, {
            ...existing,
            profile_id: pId,
            name: s.learner_name || existing.name,
            email: s.learner_email || existing.email,
            target_role: existing.target_role || 'Software Engineering',
            status: s.status,
            active_topic: s.title,
            scheduled_at: s.scheduled_at,
            session_id: s.id,
            session_obj: s,
          });
        }
      });

      const list = Array.from(directoryMap.values());
      setLearnersList(list);

      // Auto-select initial profile
      if (list.length > 0) {
        if (profileIdParam && directoryMap.has(Number(profileIdParam))) {
          setSelectedProfileId(Number(profileIdParam));
        } else if (!selectedProfileId) {
          setSelectedProfileId(list[0].profile_id);
        }
      }
    } catch (err) {
      console.error('Failed to load learners directory', err);
    } finally {
      setIsLoadingDirectory(false);
    }
  }, [profileIdParam, selectedProfileId]);

  useEffect(() => {
    loadLearnersDirectory();
  }, [loadLearnersDirectory]);

  // Load Specific Learner 360 Intel
  const loadSelectedLearnerIntel = useCallback(async (pId: number) => {
    setIsLoadingIntel(true);
    try {
      const intel = await fetchLearnerIntel(pId);
      setLearnerIntel(intel);
    } catch (err) {
      console.error('Failed to load learner 360 intel', err);
      setToastMsg({ type: 'error', message: 'Could not load learner 360° graph intelligence.' });
    } finally {
      setIsLoadingIntel(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProfileId !== null) {
      loadSelectedLearnerIntel(selectedProfileId);
    }
  }, [selectedProfileId, loadSelectedLearnerIntel]);

  // Handle Accept Open Request
  const handleAccept = async (requestId: number) => {
    setAcceptingId(requestId);
    try {
      await acceptMentorRequest(requestId);
      setToastMsg({ type: 'success', message: 'Request accepted! You can now schedule this session.' });
      loadLearnersDirectory();
      if (selectedProfileId) {
        loadSelectedLearnerIntel(selectedProfileId);
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', message: err?.message || 'Could not accept request.' });
    } finally {
      setAcceptingId(null);
    }
  };

  // Filtered list by search
  const filteredLearners = learnersList.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.target_role && l.target_role.toLowerCase().includes(q)) ||
      (l.active_topic && l.active_topic.toLowerCase().includes(q))
    );
  });

  const activeLearnerCard = learnersList.find((l) => l.profile_id === selectedProfileId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-aven-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit className="text-aven-primary" size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-aven-primary">
              Mentor Intelligence Center
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-aven-text tracking-tight">
            Learner 360° Intel & Skill Graph Position
          </h1>
          <p className="text-xs text-aven-text-subtle mt-1">
            Deep diagnostic visibility — inspect learner career goals, exact Neo4j skill graph positions, lagging bottlenecks, and AI briefing before sessions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadLearnersDirectory();
              if (selectedProfileId) loadSelectedLearnerIntel(selectedProfileId);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-aven-base border border-aven-border text-xs font-semibold text-aven-text-subtle hover:text-aven-text hover:border-indigo-500/50 transition"
          >
            <RefreshCw size={13} className={isLoadingDirectory || isLoadingIntel ? 'animate-spin' : ''} />
            <span>Refresh Intel</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg ${
            toastMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toastMsg.message}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-aven-text-subtle hover:text-aven-text">✕</button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Learner Selector Directory */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 bg-aven-base border border-aven-border rounded-2xl space-y-3 shadow-glass">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-aven-text-subtle flex items-center gap-1.5">
                <Users size={14} className="text-aven-primary" />
                <span>Active Learners ({filteredLearners.length})</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-aven-primary/20 text-aven-primary font-bold">
                Live Queue
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-aven-text-muted" size={14} />
              <input
                type="text"
                placeholder="Filter by name, topic, or goal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-aven-surface border border-aven-border rounded-xl text-xs text-aven-text placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Learner Card List */}
            {isLoadingDirectory ? (
              <div className="py-12 text-center">
                <Loader2 className="animate-spin text-aven-primary mx-auto" size={24} />
                <p className="text-xs text-aven-text-muted mt-2">Loading learners...</p>
              </div>
            ) : filteredLearners.length === 0 ? (
              <div className="py-8 text-center text-aven-text-muted text-xs">
                No matching learners found.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredLearners.map((learner) => {
                  const isSelected = learner.profile_id === selectedProfileId;
                  const isOpenReq = learner.status === 'OPEN_REQUEST';

                  return (
                    <button
                      key={learner.profile_id}
                      onClick={() => {
                        setSelectedProfileId(learner.profile_id);
                        router.replace(`/mentor/learner-intel?profile_id=${learner.profile_id}`);
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-glow-indigo'
                          : 'bg-aven-surface/60 border-aven-border hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-aven-text text-sm">{learner.name}</div>
                          <div className="text-[11px] text-aven-text-subtle truncate max-w-[180px]">
                            {learner.target_role}
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            isOpenReq
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {isOpenReq ? 'Open Request' : learner.status}
                        </span>
                      </div>

                      {learner.active_topic && (
                        <div className="text-[11px] text-aven-primary bg-aven-base/80 px-2 py-1 rounded-lg border border-aven-border truncate">
                          💬 {learner.active_topic}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Comprehensive Learner 360 Canvas */}
        <div className="lg:col-span-8 space-y-5">
          {isLoadingIntel || !learnerIntel ? (
            <div className="p-20 bg-aven-base border border-aven-border rounded-3xl text-center space-y-3">
              <Loader2 className="animate-spin text-aven-primary mx-auto" size={36} />
              <h3 className="text-sm font-bold text-aven-text">Synthesizing Learner 360° Knowledge</h3>
              <p className="text-xs text-aven-text-subtle max-w-sm mx-auto">
                Analyzing graph DAG nodes, Bayesian Knowledge Tracing scores, assessment attempts, and AI mock interview gaps...
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Hero Banner: Identity & Goal Achievement Gauge */}
              <div className="p-6 bg-aven-base border border-aven-border rounded-3xl shadow-glass space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-aven-primary/20 text-aven-primary border border-aven-primary/30">
                        Profile #{learnerIntel.profile_id}
                      </span>
                      <span className="text-xs text-aven-text-subtle font-mono">
                        {learnerIntel.email}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-aven-text flex items-center gap-2">
                      <span>{learnerIntel.name}</span>
                    </h2>
                    <div className="text-xs text-aven-text-subtle mt-1 flex items-center gap-2">
                      <Target size={13} className="text-aven-primary" />
                      <span>Target Role: <strong className="text-aven-text">{learnerIntel.target_role}</strong></span>
                      <span>•</span>
                      <span>Pace: {learnerIntel.weekly_hours} hrs/week</span>
                    </div>
                  </div>

                  {/* Actions for currently selected learner */}
                  {activeLearnerCard && activeLearnerCard.status === 'OPEN_REQUEST' && activeLearnerCard.request_id && (
                    <button
                      onClick={() => handleAccept(activeLearnerCard.request_id)}
                      disabled={acceptingId === activeLearnerCard.request_id}
                      className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-aven-text font-bold text-xs shadow-glow-indigo transition flex items-center gap-2 shrink-0"
                    >
                      {acceptingId === activeLearnerCard.request_id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <UserCheck size={14} />
                      )}
                      <span>Accept Learner Request</span>
                    </button>
                  )}
                </div>

                {/* 4 Metric Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-aven-border">
                  <div className="p-3.5 bg-aven-surface/70 rounded-2xl border border-aven-border">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-aven-text-subtle mb-1">
                      Syllabus Mastery
                    </div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-2xl font-black text-aven-text">{learnerIntel.overall_readiness_pct}%</span>
                      <span className="text-[10px] text-aven-primary font-bold">Goal: 70%+</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                        style={{ width: `${learnerIntel.overall_readiness_pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-aven-surface/70 rounded-2xl border border-aven-border">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-aven-text-subtle mb-1">
                      Active Frontier Node
                    </div>
                    <div className="text-sm font-extrabold text-aven-primary truncate">
                      {learnerIntel.current_frontier_skill
                        ? learnerIntel.current_frontier_skill.replace('_', ' ').toUpperCase()
                        : 'Advancing Smoothly'}
                    </div>
                    <div className="text-[10px] text-aven-text-muted mt-1">Current bottleneck in DAG</div>
                  </div>

                  <div className="p-3.5 bg-aven-surface/70 rounded-2xl border border-aven-border">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-aven-text-subtle mb-1">
                      Mastery Status
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="text-emerald-400">{learnerIntel.mastered_count} Done</span>
                      <span>•</span>
                      <span className="text-amber-400">{learnerIntel.in_progress_count} Prog</span>
                    </div>
                    <div className="text-[10px] text-rose-400 mt-1">{learnerIntel.lagging_count} Blocked / Lagging</div>
                  </div>

                  <div className="p-3.5 bg-aven-surface/70 rounded-2xl border border-aven-border">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-aven-text-subtle mb-1">
                      Curriculum Nodes
                    </div>
                    <div className="text-xl font-extrabold text-aven-text">
                      {learnerIntel.graph_nodes.length} Skills
                    </div>
                    <div className="text-[10px] text-aven-text-subtle mt-1">Ground-truth verified</div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-aven-border text-xs font-bold">
                <button
                  onClick={() => setActiveTab('graph')}
                  className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
                    activeTab === 'graph'
                      ? 'border-indigo-500 text-aven-primary'
                      : 'border-transparent text-aven-text-subtle hover:text-aven-text'
                  }`}
                >
                  <Network size={14} />
                  <span>Skill Graph Matrix ({learnerIntel.graph_nodes.length} Nodes)</span>
                </button>

                <button
                  onClick={() => setActiveTab('brief')}
                  className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
                    activeTab === 'brief'
                      ? 'border-indigo-500 text-aven-primary'
                      : 'border-transparent text-aven-text-subtle hover:text-aven-text'
                  }`}
                >
                  <Lightbulb size={14} />
                  <span>Mentor Action Brief & Talking Points</span>
                </button>

                <button
                  onClick={() => setActiveTab('activity')}
                  className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
                    activeTab === 'activity'
                      ? 'border-indigo-500 text-aven-primary'
                      : 'border-transparent text-aven-text-subtle hover:text-aven-text'
                  }`}
                >
                  <Activity size={14} />
                  <span>Diagnostics & Checkpoints ({learnerIntel.recent_activities.length})</span>
                </button>
              </div>

              {/* TAB 1: Skill Graph Matrix */}
              {activeTab === 'graph' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-indigo-950/20 border border-aven-primary/30 rounded-2xl text-xs text-aven-primary flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass size={16} className="text-aven-primary shrink-0" />
                      <span>
                        <strong>Neo4j Skill DAG Position:</strong> Visual state of every competency required for {learnerIntel.target_role}.
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-bold">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> Mastered (70%+)
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> In Progress (30-69%)
                      </span>
                      <span className="flex items-center gap-1 text-rose-400">
                        <span className="w-2 h-2 rounded-full bg-rose-400" /> Lagging (&lt;30%)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {learnerIntel.graph_nodes.map((node: any, idx: number) => {
                      const isMastered = node.status === 'MASTERED';
                      const isLagging = node.status === 'LAGGING';
                      const isInProgress = node.status === 'IN_PROGRESS';

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5 ${
                            node.is_frontier
                              ? 'bg-indigo-950/40 border-indigo-400 shadow-glow-indigo'
                              : isMastered
                              ? 'bg-emerald-950/10 border-emerald-500/30'
                              : isLagging
                              ? 'bg-rose-950/10 border-rose-500/30'
                              : isInProgress
                              ? 'bg-amber-950/10 border-amber-500/30'
                              : 'bg-aven-base border-aven-border'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-mono text-[10px] text-aven-text-muted bg-aven-surface px-1.5 py-0.5 rounded">
                                {node.id}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  isMastered
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : isLagging
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : isInProgress
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-aven-surface text-aven-text-subtle'
                                }`}
                              >
                                {node.status}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-aven-text">{node.name}</h4>
                            <p className="text-[11px] text-aven-text-subtle leading-snug mt-1 line-clamp-2">
                              {node.description || 'Target engineering capability.'}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-aven-border flex items-center justify-between text-xs">
                            <span className="text-[10px] text-aven-text-muted">Readiness Score:</span>
                            <span className={`font-mono font-bold ${
                              isMastered ? 'text-emerald-400' : isLagging ? 'text-rose-400' : 'text-aven-text-subtle'
                            }`}>
                              {node.readiness_score}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: Mentor Action Brief & Talking Points */}
              {activeTab === 'brief' && (
                <div className="space-y-4">
                  {/* Executive Summary Card */}
                  <div className="p-5 bg-aven-base border border-aven-border rounded-2xl space-y-2 shadow-glass">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-aven-primary flex items-center gap-1.5">
                      <Sparkles size={14} />
                      <span>Executive Coaching Brief</span>
                    </div>
                    <p className="text-sm text-aven-text leading-relaxed font-medium">
                      {learnerIntel.mentor_brief.executive_summary}
                    </p>
                  </div>

                  {/* Blocker & Root Cause Split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle size={14} />
                        <span>Identified Blocker</span>
                      </div>
                      <p className="text-xs text-aven-text-subtle leading-relaxed">
                        {learnerIntel.mentor_brief.current_blocker}
                      </p>
                    </div>

                    <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <HelpCircle size={14} />
                        <span>Root Cause Analysis</span>
                      </div>
                      <p className="text-xs text-aven-text-subtle leading-relaxed">
                        {learnerIntel.mentor_brief.root_cause_analysis}
                      </p>
                    </div>
                  </div>

                  {/* Talking Points */}
                  <div className="p-5 bg-aven-base border border-aven-border rounded-2xl space-y-3 shadow-glass">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-aven-text-subtle flex items-center gap-1.5">
                      <Lightbulb size={14} className="text-amber-400" />
                      <span>Curated 1-on-1 Discussion Talking Points</span>
                    </div>
                    <div className="space-y-2">
                      {learnerIntel.mentor_brief.suggested_talking_points.map((tp: string, idx: number) => (
                        <div key={idx} className="p-3 bg-aven-surface/70 rounded-xl border border-aven-border flex items-start gap-2.5 text-xs">
                          <span className="w-5 h-5 rounded-full bg-brand-600 text-aven-text font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-aven-text-subtle leading-relaxed">{tp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Diagnostics & Checkpoint Activity */}
              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {learnerIntel.recent_activities.length === 0 ? (
                    <div className="p-16 bg-aven-base border border-aven-border rounded-2xl text-center text-aven-text-muted text-xs">
                      No assessment attempts or interview checkpoints recorded yet.
                    </div>
                  ) : (
                    learnerIntel.recent_activities.map((act: any, aIdx: number) => (
                      <div key={aIdx} className="p-4 bg-aven-base border border-aven-border rounded-2xl flex items-center justify-between gap-4 shadow-glass">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono bg-aven-surface text-aven-primary border border-aven-border">
                              {act.activity_type}
                            </span>
                            <span className="font-bold text-aven-text text-xs">{act.title}</span>
                          </div>
                          <p className="text-[11px] text-aven-text-subtle">{act.detail}</p>
                        </div>

                        <div className="text-right shrink-0">
                          {act.score !== null && (
                            <div className="text-sm font-extrabold text-aven-text font-mono">{act.score}%</div>
                          )}
                          <span className={`text-[10px] font-bold uppercase ${
                            act.status === 'PASSED' ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {act.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meeting Modal & Dialogs */}
      {activeMeetingSession && (
        <JitsiMeetingModal
          isOpen={!!activeMeetingSession}
          roomName={activeMeetingSession.meeting_room_id || `aven-mentor-session-${activeMeetingSession.id}`}
          sessionTitle={activeMeetingSession.title || '1-on-1 Mentorship'}
          userName="Mentor"
          userRole="mentor"
          durationMinutes={activeMeetingSession.duration_minutes || 30}
          onClose={() => {
            setActiveMeetingSession(null);
            loadLearnersDirectory();
          }}
        />
      )}

      {schedulingSession && (
        <SessionScheduleDialog
          isOpen={!!schedulingSession}
          session={schedulingSession}
          onClose={() => setSchedulingSession(null)}
          onSuccess={() => {
            setSchedulingSession(null);
            loadLearnersDirectory();
            setToastMsg({ type: 'success', message: 'Session scheduled successfully!' });
          }}
        />
      )}

      {completingSession && (
        <CompleteSessionDialog
          isOpen={!!completingSession}
          session={completingSession}
          onClose={() => setCompletingSession(null)}
          onSuccess={() => {
            setCompletingSession(null);
            loadLearnersDirectory();
            setToastMsg({ type: 'success', message: 'Session marked as COMPLETED and logged.' });
          }}
        />
      )}
    </div>
  );
}

/**
 * Enterprise-grade implementation of LearnerIntelPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function LearnerIntelPage() {
  return (
    <Suspense fallback={
      <div className="p-20 text-center">
        <Loader2 className="animate-spin text-aven-primary mx-auto" size={36} />
      </div>
    }>
      <LearnerIntelContent />
    </Suspense>
  );
}
