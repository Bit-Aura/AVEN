'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Search, ExternalLink, BookOpen, Code2, BrainCircuit,
  X, RefreshCw, Video, Sparkles, ChevronDown,
  CheckCircle2, Lock, ArrowRight, ArrowLeft, ArrowDown, Star, Flame,
  Network, Map, Award, ShieldCheck, Target
} from 'lucide-react';

import { learnerRoadmapGraph } from '../../../../api/client';
import { usePathStore } from '../../../../store/usePathStore';
import ProveItAssessment from '../../../../components/ProveItAssessment';
import AiCoachDrawer from '../../../../components/AiCoachDrawer';

// ── Stage palettes ────────────────────────────────────────────────────────────
// ── Stage palettes (Cycling infinitely for any number of stages) ────────────
const STAGES_PALETTES = [
  { color: '#6366f1', glow: 'rgba(99,102,241,0.3)',  bg: 'rgba(99,102,241,0.07)',  text: '#c7d2fe', xp: 100 },
  { color: '#10b981', glow: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.07)', text: '#a7f3d0', xp: 150 },
  { color: '#f59e0b', glow: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.07)', text: '#fde68a', xp: 200 },
  { color: '#a855f7', glow: 'rgba(168,85,247,0.3)', bg: 'rgba(168,85,247,0.07)', text: '#e9d5ff', xp: 250 },
  { color: '#06b6d4', glow: 'rgba(6,182,212,0.3)',  bg: 'rgba(6,182,212,0.07)',  text: '#cffafe', xp: 300 },
  { color: '#f43f5e', glow: 'rgba(244,63,94,0.3)',  bg: 'rgba(244,63,94,0.07)',  text: '#fecdd3', xp: 350 },
  { color: '#ec4899', glow: 'rgba(236,72,153,0.3)', bg: 'rgba(236,72,153,0.07)', text: '#fbcfe8', xp: 400 },
  { color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)', bg: 'rgba(139,92,246,0.07)', text: '#ddd6fe', xp: 450 },
  { color: '#3b82f6', glow: 'rgba(59,130,246,0.3)', bg: 'rgba(59,130,246,0.07)', text: '#bfdbfe', xp: 500 },
  { color: '#14b8a6', glow: 'rgba(20,184,166,0.3)', bg: 'rgba(20,184,166,0.07)', text: '#99f6e4', xp: 550 },
];
function getStageMeta(idx: number) { return STAGES_PALETTES[idx % STAGES_PALETTES.length]; }
const getPalette = getStageMeta;

// ── Custom ReactFlow Node for Personal Learner Skill Graph ────────────────────
function PersonalSkillNode({ data }: { data: any }) {
  const isDone = data.status === 'completed';
  const isActive = data.status === 'active';

  return (
    <div
      style={{
        background: isDone ? '#062016' : isActive ? 'rgba(99,102,241,0.18)' : '#0b1329',
        border: `1.5px solid ${isDone ? '#10b981' : isActive ? '#6366f1' : '#1e293b'}`,
        boxShadow: isActive ? '0 0 20px rgba(99,102,241,0.4)' : isDone ? '0 0 10px rgba(16,185,129,0.25)' : 'none',
        borderRadius: 14,
        padding: '12px 16px',
        minWidth: 180,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: isActive ? '#6366f1' : '#334155', width: 7, height: 7, border: '2px solid #060b14' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isDone ? '#10b981' : isActive ? '#818cf8' : '#334155',
            boxShadow: isActive ? '0 0 6px #818cf8' : 'none',
            display: 'inline-block'
          }} />
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: isDone ? '#34d399' : isActive ? '#c7d2fe' : '#475569' }}>
            {isDone ? 'Mastered' : isActive ? 'Current Priority' : 'Prerequisite'}
          </span>
        </div>
        {isActive && (
          <span style={{ fontSize: 9, fontWeight: 900, background: '#6366f1', color: '#fff', padding: '1px 6px', borderRadius: 99 }}>
            ACTIVE
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: isDone ? '#86efac' : isActive ? '#fff' : '#94a3b8', lineHeight: 1.3 }}>
        {data.label}
      </div>
      {data.bkt !== undefined && (
        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 5, fontFamily: 'monospace' }}>
          Mastery: {Math.round((data.bkt || 0.15) * 100)}%
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: isActive ? '#6366f1' : '#334155', width: 7, height: 7, border: '2px solid #060b14' }} />
    </div>
  );
}

const nodeTypes = { custom: PersonalSkillNode, customGraphNode: PersonalSkillNode };

// ── Build stage buckets grouped into dynamic skill-derived phases ──────────
function buildLevels(skills: any[], edges: any[]) {
  const nameMap: Record<string, string> = {};
  skills.forEach((s: any) => { nameMap[s.id] = s.name || s.label; });

  const subtopics = skills.filter((s: any) => s.depth !== 1 && s.parent_id);
  const targetSkills = subtopics.length >= 10 ? subtopics : skills;

  const total = targetSkills.length;
  let numPhases = 4;
  if (total <= 20) numPhases = 3;
  else if (total <= 50) numPhases = 4;
  else if (total <= 90) numPhases = 5;
  else numPhases = 6;

  const chunkSize = Math.ceil(total / numPhases);
  const levelMap: Record<string, number> = {};
  const stageList = [];

  for (let i = 0; i < numPhases; i++) {
    const chunk = targetSkills.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length === 0) continue;

    chunk.forEach((n: any) => { levelMap[n.id] = i; });

    // Extract unique parent category titles for skills in this chunk
    const parentTitles = Array.from(
      new Set(chunk.map((n: any) => (n.parent_id ? nameMap[n.parent_id] : n.name || n.label)).filter(Boolean))
    );

    const phaseTitle = parentTitles.length > 0
      ? parentTitles.slice(0, 3).join(' · ')
      : `Phase ${i + 1} Module`;

    const subtopicNames = chunk.slice(0, 3).map((n: any) => n.name || n.label).join(', ');

    stageList.push({
      stageIndex: i,
      title: phaseTitle,
      desc: subtopicNames ? `Skills: ${subtopicNames}…` : '',
      featuredTopics: parentTitles.slice(0, 4).join(' · '),
      nodes: chunk
    });
  }

  return { stageList, levelMap };
}

const ROADMAPS = [
  { slug: 'backend',       label: 'Backend',       icon: '⚡' },
  { slug: 'python',        label: 'Python',        icon: '🐍' },
  { slug: 'sql',           label: 'SQL',           icon: '🗄️' },
  { slug: 'system-design', label: 'System Design', icon: '🏗️' },
  { slug: 'frontend',      label: 'Frontend',      icon: '⚛️' },
  { slug: 'devops',        label: 'DevOps',        icon: '🚀' },
  { slug: 'docker',        label: 'Docker',        icon: '🐳' },
  { slug: 'kubernetes',    label: 'Kubernetes',    icon: '☸️' },
  { slug: 'react',         label: 'React',         icon: '⚛️' },
  { slug: 'ai-engineer',   label: 'AI Engineer',   icon: '🤖' },
  { slug: 'data-engineer', label: 'Data Engineer', icon: '📊' },
  { slug: 'mlops',         label: 'MLOps',         icon: '🧠' },
];

const NODES_PER_ROW = 5;

// ── Single snake node ─────────────────────────────────────────────────────────
function SnakeNode({
  skill, globalIdx, stageIdx, selected, onClick,
  completedCount, activeIdx
}: {
  skill: any; globalIdx: number; stageIdx: number; selected: boolean; onClick: () => void;
  completedCount: number; activeIdx: number;
}) {
  const meta = getStageMeta(stageIdx);
  const isDone = globalIdx < completedCount;
  const isActive = globalIdx === activeIdx;

  const nodeNum = globalIdx + 1;

  return (
    <button
      onClick={onClick}
      title={skill.name}
      style={{
        width: 140,
        minHeight: 90,
        flexShrink: 0,
        borderRadius: 16,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 5,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        border: selected
          ? `2px solid ${meta.color}`
          : isDone
          ? '2px solid rgba(16,185,129,0.5)'
          : isActive
          ? `2px solid ${meta.color}cc`
          : '2px solid rgba(30,41,59,0.9)',
        background: selected
          ? meta.bg
          : isDone
          ? 'rgba(16,185,129,0.1)'
          : isActive
          ? meta.bg
          : 'rgba(15,23,42,0.7)',
        boxShadow: selected
          ? `0 0 24px ${meta.glow}, 0 4px 20px rgba(0,0,0,0.4)`
          : isActive
          ? `0 0 16px ${meta.glow}`
          : isDone
          ? '0 0 8px rgba(16,185,129,0.2)'
          : 'none',
        transform: selected ? 'scale(1.04)' : isActive ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <div style={{
        position: 'absolute', top: -8, left: -8,
        width: 22, height: 22, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color: '#fff',
        background: isDone ? '#10b981' : isActive ? meta.color : '#1e293b',
        border: `2px solid ${isDone ? '#065f46' : isActive ? meta.color + '88' : '#0f172a'}`,
        boxShadow: isActive ? `0 0 8px ${meta.color}` : 'none',
      }}>
        {isDone ? '✓' : nodeNum}
      </div>

      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: isDone ? '#34d399' : isActive ? meta.text : '#475569',
        display: 'flex', alignItems: 'center', gap: 4
      }}>
        {isDone ? <CheckCircle2 size={9} /> : isActive ? (
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: meta.color,
            display: 'inline-block', boxShadow: `0 0 5px ${meta.color}`,
            animation: 'pulse 1.5s infinite'
          }} />
        ) : <Lock size={8} />}
        {isDone ? 'Done' : isActive ? 'Up Next' : 'Locked'}
      </div>

      <div style={{
        fontSize: 11, fontWeight: 700, lineHeight: 1.3, textAlign: 'left',
        color: isDone ? '#86efac' : isActive ? '#f1f5f9' : '#64748b',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', maxWidth: '100%'
      }}>
        {skill.name}
      </div>

      {(isActive || isDone) && (
        <div style={{ fontSize: 9, color: meta.text, opacity: 0.7, fontFamily: 'monospace', display: 'flex', gap: 6 }}>
          <span>~{skill.est_hours || 4}h</span>
          <span>+{getStageMeta(stageIdx).xp}xp</span>
        </div>
      )}
    </button>
  );
}

function HArrow({ dir, color }: { dir: 'right' | 'left'; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {dir === 'left' && <ArrowLeft size={14} style={{ color, opacity: 0.5 }} />}
      <div style={{ width: 20, height: 2, background: `${color}55` }} />
      {dir === 'right' && <ArrowRight size={14} style={{ color, opacity: 0.5 }} />}
    </div>
  );
}

function TurnArrow({ toRight, color }: { toRight: boolean; color: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: toRight ? 'flex-end' : 'flex-start',
      paddingRight: toRight ? 65 : 0,
      paddingLeft: toRight ? 0 : 65,
      marginTop: 4,
      marginBottom: 4,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 2, height: 22, background: `${color}55` }} />
        <ArrowDown size={12} style={{ color, opacity: 0.5, marginTop: -2 }} />
      </div>
    </div>
  );
}

// ── Snake row layout for ALL nodes in a stage ───────────────────────────────
function SnakeLayout({
  nodes, stageIdx, selectedId, onSelect,
  completedCount, activeIdx
}: {
  nodes: any[]; stageIdx: number; selectedId: string | null; onSelect: (s: any) => void;
  completedCount: number; activeIdx: number;
}) {
  const meta = getStageMeta(stageIdx);
  const rows: { nodes: any[]; reversed: boolean; startGlobalIdx: number }[] = [];

  for (let i = 0; i < nodes.length; i += NODES_PER_ROW) {
    const chunk = nodes.slice(i, i + NODES_PER_ROW);
    const rowIdx = Math.floor(i / NODES_PER_ROW);
    const reversed = rowIdx % 2 === 1;
    rows.push({
      nodes: reversed ? [...chunk].reverse() : chunk,
      reversed,
      startGlobalIdx: i,
    });
  }

  return (
    <div style={{ padding: '8px 4px 4px' }}>
      {rows.map((row, ri) => {
        const getGlobalIdx = (posInRow: number) => {
          if (row.reversed) {
            return row.startGlobalIdx + (row.nodes.length - 1 - posInRow);
          }
          return row.startGlobalIdx + posInRow;
        };

        return (
          <div key={ri}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexDirection: row.reversed ? 'row-reverse' : 'row', justifyContent: 'flex-start' }}>
              {row.nodes.map((skill, posInRow) => {
                const gi = getGlobalIdx(posInRow);
                return (
                  <div key={skill.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <SnakeNode
                      skill={skill}
                      globalIdx={gi}
                      stageIdx={stageIdx}
                      selected={selectedId === skill.id}
                      onClick={() => onSelect(skill)}
                      completedCount={completedCount}
                      activeIdx={activeIdx}
                    />
                    {posInRow < row.nodes.length - 1 && (
                      <HArrow dir={row.reversed ? 'left' : 'right'} color={meta.color} />
                    )}
                  </div>
                );
              })}
            </div>

            {ri < rows.length - 1 && (
              <TurnArrow toRight={row.reversed} color={meta.color} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Topic Drawer ──────────────────────────────────────────────────────────────
function TopicDrawer({ node, stageIdx, slug, onClose, onAssess, onIde, onCoach }: {
  node: any; stageIdx: number; slug: string;
  onClose: () => void; onAssess: () => void; onIde: () => void; onCoach: () => void;
}) {
  const meta = getStageMeta(stageIdx);
  return (
    <div
      className="fixed right-0 top-0 h-full z-40 flex flex-col overflow-y-auto"
      style={{
        width: 310,
        background: '#07111e',
        borderLeft: `1px solid ${meta.color}44`,
        boxShadow: `-6px 0 40px ${meta.glow}`,
        animation: 'slideIn 0.2s ease'
      }}
    >
      <style>{`
        @keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes ping { 0%,100% { transform:scale(1);opacity:0.5; } 50% { transform:scale(1.15);opacity:0.1; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />
      <div className="p-5 border-b" style={{ borderColor: `${meta.color}20` }}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <span style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: meta.text, background: `${meta.color}22`, border: `1px solid ${meta.color}44`,
              padding: '2px 8px', borderRadius: 99, display: 'inline-block', marginBottom: 8
            }}>
              Stage {stageIdx + 1} · {meta.label}
            </span>
            <h2 className="text-white font-extrabold text-base leading-snug">{node.name || node.label}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white mt-0.5 ml-2 shrink-0 transition"><X size={15} /></button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span style={{ fontSize: 10, color: meta.text, background: `${meta.color}22`, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
            ~{node.est_hours || 4}h
          </span>
          <span style={{ fontSize: 10, color: '#64748b' }}>+{meta.xp} XP on complete</span>
        </div>
      </div>
      <div className="p-4 border-b" style={{ borderColor: 'rgba(30,41,59,0.6)' }}>
        <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.7 }}>
          {node.description || `${node.name || node.label} is a core prerequisite in the ${slug} learning path. Mastering it unlocks downstream concepts.`}
        </p>
      </div>
      <div className="p-4 border-b" style={{ borderColor: 'rgba(30,41,59,0.6)' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <BookOpen size={10} className="text-emerald-400" /> Learning Resources
        </div>
        <div className="space-y-1.5">
          {[
            { href: `https://roadmap.sh/${slug}`, icon: <ExternalLink size={10} />, label: 'roadmap.sh Guide', color: meta.color },
            { href: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(node.name || node.label)}`, icon: <BookOpen size={10} />, label: 'MDN Documentation', color: '#34d399' },
            { href: `https://www.youtube.com/results?search_query=${encodeURIComponent((node.name || node.label) + ' tutorial')}`, icon: <Video size={10} />, label: 'Video Tutorials', color: '#fb7185' },
          ].map((r, i) => (
            <a key={i} href={r.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 py-2 px-3 rounded-lg border border-[#1e293b] hover:bg-[#0f172a] transition text-[11px] group"
            >
              <span style={{ color: r.color }}>{r.icon}</span>
              <span className="text-slate-400 group-hover:text-white flex-1">{r.label}</span>
              <span style={{ color: r.color, fontSize: 9 }}>→</span>
            </a>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-2 mt-auto">
        <button onClick={onAssess}
          className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition hover:brightness-110"
          style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}aa)`, boxShadow: `0 4px 18px ${meta.glow}` }}
        >
          <Sparkles size={13} /> Prove Mastery
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onIde}
            className="py-2 rounded-xl text-[11px] font-semibold border border-[#1e293b] bg-[#0a1020] hover:bg-[#1e293b] text-slate-300 flex items-center justify-center gap-1.5 transition"
          >
            <Code2 size={11} className="text-indigo-400" /> Practice
          </button>
          <button onClick={onCoach}
            className="py-2 rounded-xl text-[11px] font-semibold border border-[#1e293b] bg-[#0a1020] hover:bg-[#1e293b] text-slate-300 flex items-center justify-center gap-1.5 transition"
          >
            <BrainCircuit size={11} className="text-emerald-400" /> AI Coach
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GraphPage() {
  const [viewMode, setViewMode] = useState<'graph' | 'roadmap'>('graph');
  const [selectedRoadmap, setSelectedRoadmap] = useState('backend');
  const [loading, setLoading] = useState(true);
  const [rawSkills, setRawSkills] = useState<any[]>([]);
  const [rawEdges, setRawEdges] = useState<any[]>([]);
  const [stages, setStages] = useState<{ stageIndex: number; nodes: any[] }[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ skill: any; stageIdx: number } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [totalXP, setTotalXP] = useState(0);

  // Store state for Learner's Personal Skill Graph
  const targetRole = usePathStore((s) => s.targetRole);
  const readinessScore = usePathStore((s) => s.readinessScore);
  const learnerNodes = usePathStore((s) => s.nodes);
  const learnerEdges = usePathStore((s) => s.edges);
  const fetchActivePath = usePathStore((s) => s.fetchActivePath);

  // ReactFlow state for Skill Graph
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const openIde = usePathStore((s) => s.openIde);
  const openCoach = usePathStore((s) => s.openCoach);

  // Load learner's personal path on mount
  useEffect(() => {
    fetchActivePath();
  }, [fetchActivePath]);

  // Load roadmap topologies
  useEffect(() => {
    loadRoadmap(selectedRoadmap);
  }, [selectedRoadmap]);

  // Sync ReactFlow graph when switching to 'graph' mode or when learnerNodes update
  useEffect(() => {
    if (viewMode === 'graph') {
      if (learnerNodes && learnerNodes.length > 0) {
        setNodes(learnerNodes);
        setEdges(learnerEdges);
      }
    }
  }, [viewMode, learnerNodes, learnerEdges, setNodes, setEdges]);

  const loadRoadmap = async (slug: string) => {
    setLoading(true);
    setSelected(null);
    setCollapsed(new Set());
    try {
      const data = await learnerRoadmapGraph(slug);
      const skillsList: any[] = data.skills || [];
      const edgesList: any[] = data.edges || [];

      setRawSkills(skillsList);
      setRawEdges(edgesList);

      const { stageList } = buildLevels(skillsList, edgesList);
      setStages(stageList);
      setTotalXP(stageList.reduce((acc, s) => acc + s.nodes.length * getStageMeta(s.stageIndex).xp, 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleCollapse = (idx: number) => {
    setCollapsed((p) => { const n = new Set(p); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  };

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setSelected({ skill: node.data.rawSkill || node.data, stageIdx: 0 });
  }, []);

  const filteredStages = stages.map((s) => ({
    ...s,
    nodes: query ? s.nodes.filter((n: any) => n.name.toLowerCase().includes(query.toLowerCase())) : s.nodes
  })).filter((s) => s.nodes.length > 0);

  const filteredGraphNodes = nodes.filter((n) =>
    (n.data?.label as string || '').toLowerCase().includes(query.toLowerCase())
  );

  const COMPLETED = 2;
  const ACTIVE_IDX = 2;

  return (
    <div className="flex flex-col bg-[#050a14] h-[calc(100vh-80px)]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes ping { 0%,100% { transform:scale(1);opacity:0.5 } 50% { transform:scale(1.15);opacity:0.1 } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        ::-webkit-scrollbar { width:4px;height:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:#1e293b;border-radius:9px }
      `}</style>

      {/* ── Top Header Bar with View Switcher & Context ── */}
      <div className="border-b border-[#1e293b] bg-[#050a14]/96 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Flame className="text-indigo-400" size={18} />
              <span className="text-white font-extrabold text-base">Skill Map Engine</span>
            </div>

            {/* View Mode Switcher: Personal Learner Skill Graph vs Canonical Roadmap Path */}
            <div className="flex items-center bg-[#0d1525] p-1 rounded-xl border border-[#1e293b] ml-4">
              <button
                onClick={() => setViewMode('graph')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'graph'
                    ? 'bg-indigo-600 text-white shadow-glow-indigo'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Network size={14} />
                <span>Personal Skill Graph</span>
              </button>
              <button
                onClick={() => setViewMode('roadmap')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'roadmap'
                    ? 'bg-indigo-600 text-white shadow-glow-indigo'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Map size={14} />
                <span>Canonical Roadmaps</span>
              </button>
            </div>

            {viewMode === 'graph' ? (
              <div className="hidden lg:flex items-center gap-2 ml-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1 bg-surface-secondary/60 px-2.5 py-1 rounded-lg border border-border">
                  <Target size={12} className="text-indigo-400" />
                  {targetRole}
                </span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  <Award size={12} />
                  {readinessScore}% Readiness
                </span>
              </div>
            ) : (
              !loading && (
                <div className="hidden lg:flex items-center gap-2 ml-3">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-500/25 font-bold">
                    {rawSkills.length} NODES · {rawEdges.length} EDGES
                  </span>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-950/40 text-amber-300 border border-amber-500/25 font-bold">
                    <Star size={8} className="inline mr-1" />{totalXP.toLocaleString()} total XP
                  </span>
                </div>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 text-slate-600" size={11} />
              <input
                type="text" value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={viewMode === 'graph' ? "Search skill graph…" : "Search roadmap nodes…"}
                className="bg-[#0c1625] border border-[#1e293b] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-44"
              />
            </div>
            <button onClick={() => viewMode === 'graph' ? fetchActivePath() : loadRoadmap(selectedRoadmap)} disabled={loading}
              className="p-1.5 bg-[#0c1625] hover:bg-[#1e293b] text-slate-400 border border-[#1e293b] rounded-lg transition"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin text-indigo-400' : ''} />
            </button>
          </div>
        </div>

        {/* Roadmap selector tabs (Only visible in Roadmap Path mode) */}
        {viewMode === 'roadmap' && (
          <div className="flex items-center gap-1 px-6 pb-2.5 overflow-x-auto scrollbar-none border-t border-[#1e293b]/40 pt-2">
            {ROADMAPS.map((r) => {
              const active = selectedRoadmap === r.slug;
              return (
                <button key={r.slug} onClick={() => setSelectedRoadmap(r.slug)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition shrink-0"
                  style={{
                    background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                    color: active ? '#a5b4fc' : '#475569',
                    border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                  }}
                >
                  <span>{r.icon}</span><span>{r.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Main Canvas / Roadmap Area ── */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {loading && viewMode === 'roadmap' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050a14]">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-semibold">Loading complete {selectedRoadmap} curriculum ({rawSkills.length} nodes)…</p>
          </div>
        )}

        {/* ── VIEW 1: LEARNER'S PERSONAL SKILL GRAPH CANVAS ── */}
        {viewMode === 'graph' && (
          <div className="flex-1 relative bg-[#050a14] h-full" style={{ marginRight: selected ? 310 : 0 }}>
            <ReactFlow
              nodes={filteredGraphNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={2.5}
              className="dark"
            >
              <Background color="#1e293b" gap={32} size={1} />
              <Controls className="bg-[#0f172a] border border-[#1e293b]" style={{ bottom: 20, left: 20 }} />
              <MiniMap
                nodeColor={(n) => n.data.status === 'completed' ? '#10b981' : n.data.status === 'active' ? '#6366f1' : '#334155'}
                maskColor="rgba(5, 10, 20, 0.85)"
                style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: 10 }}
              />
              <Panel position="top-right" className="flex items-center gap-3 text-xs bg-[#0c1625]/90 border border-[#1e293b] px-4 py-2 rounded-xl backdrop-blur">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Personal Target Role Graph: <strong className="text-white">{targetRole}</strong></span>
                </div>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400 font-bold">{readinessScore}% Match</span>
              </Panel>
            </ReactFlow>
          </div>
        )}

        {/* ── VIEW 2: GAMIFIED ROADMAP PATH ── */}
        {viewMode === 'roadmap' && !loading && (
          <div
            className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center w-full"
            style={{ paddingRight: selected ? 330 : 24 }}
          >
            <div className="w-full max-w-5xl space-y-4">
            {filteredStages.map((stage, si) => {
              const meta = getStageMeta(stage.stageIndex);
              const isCollapsed = collapsed.has(stage.stageIndex);
              const stageCompleted = si === 0 ? COMPLETED : 0;
              const stageActive = si === 0 ? ACTIVE_IDX : -1;
              const completePct = Math.round((stageCompleted / stage.nodes.length) * 100);

              return (
                <div key={stage.stageIndex}>
                  <div style={{
                    borderRadius: 20,
                    border: `1px solid ${meta.color}30`,
                    background: `linear-gradient(170deg, ${meta.bg} 0%, rgba(5,10,20,0.7) 100%)`,
                    boxShadow: `0 8px 40px ${meta.glow}`,
                    overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => toggleCollapse(stage.stageIndex)}
                      className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-white/5 transition"
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                        display: 'flex', items: 'center', justifyCenter: 'center',
                        background: `linear-gradient(135deg, ${meta.color}, ${meta.color}88)`,
                        boxShadow: `0 4px 16px ${meta.glow}`,
                        fontSize: 16, fontWeight: 900, color: '#fff',
                      }}>
                        {stage.stageIndex + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>{stage.title}</span>
                          <span style={{
                            fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
                            color: meta.text, background: `${meta.color}22`, border: `1px solid ${meta.color}44`,
                            padding: '1px 7px', borderRadius: 99
                          }}>
                            PHASE {stage.stageIndex + 1}
                          </span>
                        </div>
                        {stage.featuredTopics && (
                          <div style={{ fontSize: 11, color: meta.text, opacity: 0.85, fontWeight: 600, marginBottom: 3 }}>
                            Includes: {stage.featuredTopics}
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            {stage.nodes.length} skills in this phase
                            {stageCompleted > 0 && ` · ${stageCompleted} completed`}
                          </span>
                          <span style={{ fontSize: 10, color: meta.text, fontFamily: 'monospace' }}>
                            +{(meta.xp * stage.nodes.length).toLocaleString()} XP
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <div style={{ width: 64, height: 4, borderRadius: 9, background: '#1e293b', overflow: 'hidden' }}>
                            <div style={{ width: `${completePct}%`, height: '100%', background: meta.color, borderRadius: 9, transition: 'width 0.7s ease' }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', minWidth: 28 }}>
                            {stageCompleted}/{stage.nodes.length}
                          </span>
                        </div>
                        <ChevronDown size={16} className="text-slate-500 transition-transform"
                          style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                        />
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="px-6 pb-6 overflow-x-auto">
                        <SnakeLayout
                          nodes={stage.nodes}
                          stageIdx={stage.stageIndex}
                          selectedId={selected?.skill?.id || null}
                          onSelect={(skill) => setSelected({ skill, stageIdx: stage.stageIndex })}
                          completedCount={stageCompleted}
                          activeIdx={stageActive}
                        />
                      </div>
                    )}
                  </div>

                  {si < filteredStages.length - 1 && (
                    <div className="flex flex-col items-center py-1.5">
                      <div style={{ width: 2, height: 20, background: `linear-gradient(180deg, ${meta.color}66, ${getStageMeta(filteredStages[si + 1].stageIndex).color}66)` }} />
                      <div style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `9px solid ${getStageMeta(filteredStages[si + 1].stageIndex).color}88` }} />
                    </div>
                  )}
                </div>
              );
            })}
            <div className="h-20" />
            </div>
          </div>
        )}

        {/* ── Topic Drawer (Shared across both views) ── */}
        {selected && (
          <TopicDrawer
            node={selected.skill}
            stageIdx={selected.stageIdx}
            slug={selectedRoadmap}
            onClose={() => setSelected(null)}
            onAssess={() => setIsAssessmentOpen(true)}
            onIde={() => openIde(selected.skill.id || selected.skill.name)}
            onCoach={() => openCoach(selected.skill.id || selected.skill.name)}
          />
        )}
      </div>

      {/* Assessment Modal */}
      {isAssessmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1525] border border-[#1e293b] rounded-2xl p-6 max-w-xl w-full shadow-2xl relative">
            <button onClick={() => setIsAssessmentOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={18} /></button>
            <ProveItAssessment />
          </div>
        </div>
      )}

      <AiCoachDrawer />
    </div>
  );
}
