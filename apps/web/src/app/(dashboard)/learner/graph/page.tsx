'use client';

import { useState, useEffect } from 'react';
import {
  Search, ExternalLink, BookOpen, Code2, BrainCircuit,
  X, RefreshCw, Video, Sparkles, ChevronDown,
  CheckCircle2, Lock, ArrowRight, ArrowLeft, ArrowDown, Star, Flame
} from 'lucide-react';

import { learnerRoadmapGraph } from '../../../../api/client';
import { usePathStore } from '../../../../store/usePathStore';
import ProveItAssessment from '../../../../components/ProveItAssessment';
import AiCoachDrawer from '../../../../components/AiCoachDrawer';

// ── Stage palettes ────────────────────────────────────────────────────────────
const STAGES = [
  { label: 'Foundation',   color: '#6366f1', glow: 'rgba(99,102,241,0.3)',  bg: 'rgba(99,102,241,0.07)',  text: '#c7d2fe', xp: 100 },
  { label: 'Core Skills',  color: '#10b981', glow: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.07)', text: '#a7f3d0', xp: 200 },
  { label: 'Intermediate', color: '#f59e0b', glow: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.07)', text: '#fde68a', xp: 350 },
  { label: 'Advanced',     color: '#a855f7', glow: 'rgba(168,85,247,0.3)', bg: 'rgba(168,85,247,0.07)', text: '#e9d5ff', xp: 500 },
  { label: 'Expert',       color: '#06b6d4', glow: 'rgba(6,182,212,0.3)',  bg: 'rgba(6,182,212,0.07)',  text: '#cffafe', xp: 750 },
  { label: 'Mastery',      color: '#f43f5e', glow: 'rgba(244,63,94,0.3)',  bg: 'rgba(244,63,94,0.07)',  text: '#fecdd3', xp: 1000 },
];
function getStageMeta(idx: number) { return STAGES[Math.min(idx, STAGES.length - 1)]; }

// ── Build topological level buckets ──────────────────────────────────────────
function buildLevels(skills: any[], edges: any[]) {
  const idSet = new Set(skills.map((s: any) => s.id));
  const adj: Record<string, string[]> = {};
  const deg: Record<string, number> = {};
  skills.forEach((s: any) => { adj[s.id] = []; deg[s.id] = 0; });
  edges.forEach((e: any) => {
    if (idSet.has(e.source_id) && idSet.has(e.target_id)) {
      adj[e.source_id].push(e.target_id);
      deg[e.target_id] = (deg[e.target_id] || 0) + 1;
    }
  });
  const level: Record<string, number> = {};
  const q: string[] = [];
  skills.forEach((s: any) => { if (!deg[s.id]) { level[s.id] = 0; q.push(s.id); } });
  let h = 0;
  while (h < q.length) {
    const cur = q[h++];
    (adj[cur] || []).forEach((nxt) => {
      const nl = (level[cur] || 0) + 1;
      if (level[nxt] === undefined || level[nxt] < nl) level[nxt] = nl;
      if (--deg[nxt] === 0) q.push(nxt);
    });
  }
  const byStage: Record<number, any[]> = {};
  skills.forEach((s: any) => {
    const l = level[s.id] ?? 0;
    if (!byStage[l]) byStage[l] = [];
    byStage[l].push(s);
  });
  return Object.keys(byStage).map(Number).sort((a, b) => a - b)
    .map((l) => ({ stageIndex: l, nodes: byStage[l] }));
}

const ROADMAPS = [
  { slug: 'backend',       label: 'Backend',      icon: '⚡' },
  { slug: 'python',        label: 'Python',        icon: '🐍' },
  { slug: 'sql',           label: 'SQL',           icon: '🗄️' },
  { slug: 'system-design', label: 'System Design', icon: '🏗️' },
  { slug: 'frontend',      label: 'Frontend',      icon: '⚛️' },
  { slug: 'devops',        label: 'DevOps',        icon: '🚀' },
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
  const isLocked = !isDone && !isActive;

  const nodeNum = globalIdx + 1;

  return (
    <button
      onClick={onClick}
      title={skill.name}
      style={{
        width: 130,
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
      {/* Node number badge */}
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

      {/* Status line */}
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

      {/* Name */}
      <div style={{
        fontSize: 11, fontWeight: 700, lineHeight: 1.3, textAlign: 'left',
        color: isDone ? '#86efac' : isActive ? '#f1f5f9' : '#475569',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', maxWidth: '100%'
      }}>
        {skill.name}
      </div>

      {/* Hours + XP on active/done */}
      {(isActive || isDone) && (
        <div style={{ fontSize: 9, color: meta.text, opacity: 0.7, fontFamily: 'monospace', display: 'flex', gap: 6 }}>
          <span>~{skill.est_hours || 4}h</span>
          <span>+{getStageMeta(stageIdx).xp}xp</span>
        </div>
      )}

      {/* Active glow pulse ring */}
      {isActive && (
        <div style={{
          position: 'absolute', inset: -4, borderRadius: 20,
          border: `1px solid ${meta.color}66`,
          pointerEvents: 'none',
          animation: 'ping 2s ease-out infinite',
        }} />
      )}
    </button>
  );
}

// ── Arrow between nodes ───────────────────────────────────────────────────────
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
  // SVG corner connector: goes down then turns
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

// ── Snake row layout for a stage ──────────────────────────────────────────────
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
        // Re-map indices back to real position in original nodes array
        const getGlobalIdx = (posInRow: number) => {
          if (row.reversed) {
            return row.startGlobalIdx + (row.nodes.length - 1 - posInRow);
          }
          return row.startGlobalIdx + posInRow;
        };

        return (
          <div key={ri}>
            {/* Node row */}
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

            {/* Turn arrow at end of row (if more rows follow) */}
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
        width: 300,
        background: '#07111e',
        borderLeft: `1px solid ${meta.color}44`,
        boxShadow: `-6px 0 40px ${meta.glow}`,
        animation: 'slideIn 0.2s ease'
      }}
    >
      <style>{`
        @keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes ping { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.12); opacity: 0.1; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
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
            <h2 className="text-white font-extrabold text-base leading-snug">{node.name}</h2>
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
          {node.description || `${node.name} is a key milestone in the ${slug} learning path. Unlock it to advance to the next stage.`}
        </p>
      </div>
      <div className="p-4 border-b" style={{ borderColor: 'rgba(30,41,59,0.6)' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <BookOpen size={10} className="text-emerald-400" /> Resources
        </div>
        <div className="space-y-1.5">
          {[
            { href: `https://roadmap.sh/${slug}`, icon: <ExternalLink size={10} />, label: 'roadmap.sh', color: meta.color },
            { href: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(node.name)}`, icon: <BookOpen size={10} />, label: 'MDN Docs', color: '#34d399' },
            { href: `https://www.youtube.com/results?search_query=${encodeURIComponent(node.name + ' tutorial')}`, icon: <Video size={10} />, label: 'Video Tutorials', color: '#fb7185' },
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
  const [selectedRoadmap, setSelectedRoadmap] = useState('backend');
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<{ stageIndex: number; nodes: any[] }[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ skill: any; stageIdx: number } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [totalXP, setTotalXP] = useState(0);

  const openIde = usePathStore((s) => s.openIde);
  const openCoach = usePathStore((s) => s.openCoach);

  useEffect(() => { load(selectedRoadmap); }, [selectedRoadmap]);

  const load = async (slug: string) => {
    setLoading(true);
    setSelected(null);
    setCollapsed(new Set());
    try {
      const data = await learnerRoadmapGraph(slug);
      const stageList = buildLevels(data.skills || [], data.edges || []);
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

  const filtered = stages.map((s) => ({
    ...s,
    nodes: query ? s.nodes.filter((n: any) => n.name.toLowerCase().includes(query.toLowerCase())) : s.nodes
  })).filter((s) => s.nodes.length > 0);

  const totalNodes = stages.reduce((a, s) => a + s.nodes.length, 0);
  const COMPLETED = 2;
  const ACTIVE_IDX = 2;

  return (
    <div className="flex bg-[#050a14] min-h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes ping { 0%,100% { transform:scale(1);opacity:0.5 } 50% { transform:scale(1.15);opacity:0.1 } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(12px) } to { opacity:1;transform:translateY(0) } }
        ::-webkit-scrollbar { width:4px;height:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:#1e293b;border-radius:9px }
      `}</style>

      {/* ── Main content ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ marginRight: selected ? 300 : 0, transition: 'margin-right 0.2s ease' }}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-30 border-b border-[#1e293b] bg-[#050a14]/96 backdrop-blur-md">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Flame className="text-indigo-400" size={16} />
                <span className="text-white font-extrabold text-sm">Skill Roadmap</span>
              </div>
              {!loading && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-500/25">
                    {stages.length} stages · {totalNodes} topics
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-300 border border-amber-500/25">
                    <Star size={8} className="inline mr-1" />{totalXP.toLocaleString()} total XP
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 text-slate-600" size={11} />
                <input
                  type="text" value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search topics…"
                  className="bg-[#0c1625] border border-[#1e293b] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-36"
                />
              </div>
              <button onClick={() => load(selectedRoadmap)} disabled={loading}
                className="p-1.5 bg-[#0c1625] hover:bg-[#1e293b] text-slate-400 border border-[#1e293b] rounded-lg transition"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin text-indigo-400' : ''} />
              </button>
            </div>
          </div>

          {/* Roadmap tabs */}
          <div className="flex items-center gap-1 px-6 pb-2.5 overflow-x-auto scrollbar-none">
            {ROADMAPS.map((r) => {
              const active = selectedRoadmap === r.slug;
              return (
                <button key={r.slug} onClick={() => setSelectedRoadmap(r.slug)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition shrink-0"
                  style={{
                    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: active ? '#a5b4fc' : '#475569',
                    border: active ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                  }}
                >
                  <span>{r.icon}</span><span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-9 h-9 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500">Building your learning path…</p>
          </div>
        )}

        {/* Stage map */}
        {!loading && (
          <div className="px-6 py-8 max-w-5xl mx-auto space-y-2" style={{ animation: 'fadeUp 0.4s ease' }}>
            {filtered.map((stage, si) => {
              const meta = getStageMeta(stage.stageIndex);
              const isCollapsed = collapsed.has(stage.stageIndex);
              const stageCompleted = si === 0 ? COMPLETED : 0;
              const stageActive = si === 0 ? ACTIVE_IDX : -1;
              const completePct = Math.round((stageCompleted / stage.nodes.length) * 100);

              return (
                <div key={stage.stageIndex} style={{ animation: `fadeUp 0.35s ease ${si * 0.07}s both` }}>
                  {/* Stage box */}
                  <div style={{
                    borderRadius: 20,
                    border: `1px solid ${meta.color}30`,
                    background: `linear-gradient(170deg, ${meta.bg} 0%, rgba(5,10,20,0.7) 100%)`,
                    boxShadow: `0 8px 40px ${meta.glow}`,
                    overflow: 'hidden',
                  }}>
                    {/* Stage header */}
                    <button
                      onClick={() => toggleCollapse(stage.stageIndex)}
                      className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-white/5 transition"
                    >
                      {/* Number circle */}
                      <div style={{
                        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `linear-gradient(135deg, ${meta.color}, ${meta.color}88)`,
                        boxShadow: `0 4px 16px ${meta.glow}`,
                        fontSize: 16, fontWeight: 900, color: '#fff',
                      }}>
                        {stage.stageIndex + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>{meta.label}</span>
                          <span style={{
                            fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
                            color: meta.text, background: `${meta.color}22`, border: `1px solid ${meta.color}44`,
                            padding: '1px 7px', borderRadius: 99
                          }}>
                            STAGE {stage.stageIndex + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            {stage.nodes.length} topics
                            {stageCompleted > 0 && ` · ${stageCompleted} completed`}
                          </span>
                          <span style={{ fontSize: 10, color: meta.text, fontFamily: 'monospace' }}>
                            +{(meta.xp * stage.nodes.length).toLocaleString()} XP
                          </span>
                        </div>
                      </div>

                      {/* Progress + chevron */}
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

                    {/* Snake path */}
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

                  {/* Stage-to-stage connector */}
                  {si < filtered.length - 1 && (
                    <div className="flex flex-col items-center py-1.5">
                      <div style={{ width: 2, height: 20, background: `linear-gradient(180deg, ${meta.color}66, ${getStageMeta(filtered[si + 1].stageIndex).color}66)` }} />
                      <div style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `9px solid ${getStageMeta(filtered[si + 1].stageIndex).color}88` }} />
                    </div>
                  )}
                </div>
              );
            })}
            <div className="h-20" />
          </div>
        )}
      </div>

      {/* ── Sliding drawer ── */}
      {selected && (
        <TopicDrawer
          node={selected.skill}
          stageIdx={selected.stageIdx}
          slug={selectedRoadmap}
          onClose={() => setSelected(null)}
          onAssess={() => setIsAssessmentOpen(true)}
          onIde={() => openIde(selected.skill.id)}
          onCoach={() => openCoach(selected.skill.id)}
        />
      )}

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
