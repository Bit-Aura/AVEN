'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Code2, BrainCircuit, X, Sparkle, Network, Map, Compass, ArrowRight, CheckCircle2, Lock, Heart,
  Clock, BarChart, Target, Check, Command, MonitorPlay, Mic
} from 'lucide-react';

import { learnerRoadmapGraph } from '../../../../api/client';
import { usePathStore } from '../../../../store/usePathStore';
import { useActivePathQuery } from '../../../../hooks/api/useQueries';
import ProveItAssessment from '../../../../components/ProveItAssessment';
import AiCoachDrawer from '../../../../components/AiCoachDrawer';

// ── ROADMAP SELECTOR ──────────────────────────────────────────────────────────
/**
 * Enterprise-grade implementation of ROADMAPS.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const ROADMAPS = [
  { slug: 'backend',       label: 'Backend' },
  { slug: 'python',        label: 'Python' },
  { slug: 'sql',           label: 'SQL' },
  { slug: 'system-design', label: 'System Design' },
  { slug: 'frontend',      label: 'Frontend' },
  { slug: 'devops',        label: 'DevOps' },
  { slug: 'docker',        label: 'Docker' },
  { slug: 'kubernetes',    label: 'Kubernetes' },
];

// ── LAYOUT CONSTANTS ──────────────────────────────────────────────────────────
/**
 * Enterprise-grade implementation of SPINE_NODE_W.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const SPINE_NODE_W = 260;
/**
 * Enterprise-grade implementation of SPINE_NODE_H.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const SPINE_NODE_H = 56;
/**
 * Enterprise-grade implementation of LEAF_NODE_W.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const LEAF_NODE_W  = 200;
/**
 * Enterprise-grade implementation of LEAF_NODE_H.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const LEAF_NODE_H  = 44;
/**
 * Enterprise-grade implementation of CONTAINER_PAD.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const CONTAINER_PAD = 16;
/**
 * Enterprise-grade implementation of SUB_GAP_X.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const SUB_GAP_X    = 16;
/**
 * Enterprise-grade implementation of SUB_GAP_Y.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const SUB_GAP_Y    = 12;
/**
 * Enterprise-grade implementation of FAN_MARGIN.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const FAN_MARGIN   = 80;
/**
 * Enterprise-grade implementation of SPINE_GAP.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const SPINE_GAP    = 60;
/**
 * Enterprise-grade implementation of CENTER_X.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const CENTER_X     = 700;

/**
 * Enterprise-grade implementation of CONTAINER_KEYWORDS.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const CONTAINER_KEYWORDS = [
  'languages', 'databases', 'tools', 'types', 'styles',
  'frameworks', 'libraries', 'platforms', 'services', 'protocols',
];

// ── REACT FLOW NODE COMPONENTS ────────────────────────────────────────────────

/**
 * Enterprise-grade implementation of SpineNode.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const SpineNode = ({ data }: any) => {
  const status = data.skill?.status; // 'completed' | 'active' | 'locked' | undefined
  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  const isLocked = status === 'locked';

  return (
    <div style={{
      width: SPINE_NODE_W, minHeight: SPINE_NODE_H,
      background: isCompleted ? 'var(--aven-base)' : 'var(--aven-primary)', 
      border: isCompleted ? '1px solid var(--aven-status-mastered)' : isActive ? '2px solid var(--aven-status-active)' : '1px solid var(--aven-primary)',
      borderRadius: '12px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '10px 14px',
      cursor: isLocked ? 'not-allowed' : 'pointer', 
      transition: 'all 0.2s ease',
      opacity: isLocked ? 0.6 : 1,
      boxShadow: isActive ? '0 0 0 4px rgba(247, 184, 1, 0.2)' : 'none',
    }} className={!isLocked ? "hover:opacity-90 hover:-translate-y-0.5" : ""}>
      <Handle type="target" position={Position.Top}   id="top"     style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom"  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left}  id="left-t"  style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left}  id="left-s"  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right-t" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right-s" style={{ opacity: 0 }} />
      
      <span style={{ 
        fontSize: 13, fontWeight: 700, 
        color: isCompleted ? 'var(--aven-text)' : 'var(--aven-base)', 
        textAlign: 'left', lineHeight: 1.25, flex: 1
      }}>
        {data.label}
      </span>

      {isCompleted && <CheckCircle2 size={16} className="text-aven-status-mastered ml-2 shrink-0" />}
      {isLocked && <Lock size={14} className="text-aven-status-locked ml-2 shrink-0" />}
      {isActive && <div className="w-2 h-2 rounded-full bg-aven-status-active ml-2 shrink-0 animate-pulse" />}
    </div>
  );
};

/**
 * Enterprise-grade implementation of LeafNode.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const LeafNode = ({ data }: any) => {
  const status = data.skill?.status;
  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  const isLocked = status === 'locked';

  return (
    <div style={{
      width: LEAF_NODE_W, minHeight: LEAF_NODE_H,
      background: isCompleted ? 'var(--aven-base)' : isActive ? '#fff' : 'var(--aven-surface)', 
      border: isCompleted ? '1px dashed var(--aven-status-mastered)' : isActive ? '2px solid var(--aven-status-active)' : '1px solid var(--aven-border)',
      borderRadius: '8px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '6px 10px',
      cursor: isLocked ? 'not-allowed' : 'pointer', 
      transition: 'all 0.2s ease',
      opacity: isLocked ? 0.6 : 1,
    }} className={!isLocked ? "hover:bg-aven-secondary/10 hover:border-aven-secondary hover:text-aven-primary hover:-translate-y-0.5" : ""}>
      <Handle type="target" position={Position.Left}  id="left-t"  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right-t" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left}  id="left-s"  style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right-s" style={{ opacity: 0 }} />
      
      <span style={{ 
        fontSize: 12, fontWeight: 600, 
        color: isCompleted ? 'var(--aven-text)' : 'var(--aven-text)', 
        textAlign: 'left', lineHeight: 1.2, flex: 1 
      }} className={!isLocked ? "group-hover:text-aven-primary" : ""}>
        {data.label}
      </span>

      {isCompleted && <CheckCircle2 size={14} className="text-aven-status-mastered ml-2 shrink-0" />}
      {isLocked && <Lock size={12} className="text-aven-status-locked ml-2 shrink-0" />}
      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-aven-status-active ml-2 shrink-0 animate-pulse" />}
    </div>
  );
};

/**
 * Enterprise-grade implementation of ContainerNode.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const ContainerNode = ({ data }: any) => (
  <div style={{
    width: data.containerW || 500, height: data.containerH || 200,
    background: 'transparent', border: '1px dashed var(--aven-text-muted)',
    borderRadius: '12px', padding: CONTAINER_PAD,
    pointerEvents: 'none',
  }}>
    <Handle type="target" position={Position.Left}  id="left-t"  style={{ opacity: 0 }} />
    <Handle type="target" position={Position.Right} id="right-t" style={{ opacity: 0 }} />
    <span style={{
      fontSize: 10, fontWeight: 800, color: 'var(--aven-text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {data.label}
    </span>
  </div>
);

/**
 * Enterprise-grade implementation of LabelNode.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const LabelNode = ({ data }: any) => (
  <div style={{ pointerEvents: 'none' }}>
    <span style={{
      fontSize: 10, fontWeight: 800, color: 'var(--aven-text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {data.label}
    </span>
  </div>
);

const nodeTypes = {
  spineNode: SpineNode,
  leafNode: LeafNode,
  containerNode: ContainerNode,
  labelNode: LabelNode,
};

// ── PATTERN TYPES ─────────────────────────────────────────────────────────────
type PatternType = 'FAN_LIST' | 'FAN_GRID' | 'LABELED_CONTAINER';

interface GroupClassification {
  type: PatternType;
  items: any[];
  cols: number;
}

// ── PATTERN CLASSIFIER ────────────────────────────────────────────────────────
function classifyGroup(
  parent: any,
  children: any[]
): GroupClassification {
  const leafChildren  = children;

  if (leafChildren.length === 0) {
    return { type: 'FAN_LIST', items: [], cols: 1 };
  }

  const parentName = (parent.name || '').toLowerCase();
  const avgNameLen = leafChildren.reduce((s, c) => s + (c.name || '').length, 0) / leafChildren.length;

  const isContainer = CONTAINER_KEYWORDS.some(kw => parentName.includes(kw));
  if (isContainer && leafChildren.length >= 3) {
    const cols = Math.min(4, Math.ceil(Math.sqrt(leafChildren.length / 1.5)));
    return { type: 'LABELED_CONTAINER', items: leafChildren, cols };
  }

  if (avgNameLen < 22 && leafChildren.length >= 6) {
    const cols = Math.min(4, Math.ceil(Math.sqrt(leafChildren.length / 1.5)));
    return { type: 'FAN_GRID', items: leafChildren, cols };
  }

  if (leafChildren.length <= 5) {
    return { type: 'FAN_LIST', items: leafChildren, cols: 1 };
  }

  return { type: 'FAN_GRID', items: leafChildren, cols: 2 };
}

// ── LAYOUT RENDERERS ──────────────────────────────────────────────────────────

interface ClusterResult {
  nodes: any[];
  edges: any[];
  width: number;
  height: number;
}

/**
 * Enterprise-grade implementation of EDGE_STYLE_FAN.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const EDGE_STYLE_FAN = { stroke: '#87867f', strokeWidth: 1.5, strokeDasharray: '4 4' };

function layoutFanList(
  parentId: string, items: any[], originX: number, originY: number, direction: 1 | -1
): ClusterResult {
  const nodes: any[] = [];
  const edges: any[] = [];
  const h = items.length * (LEAF_NODE_H + SUB_GAP_Y) - SUB_GAP_Y;

  items.forEach((item, idx) => {
    const x = originX;
    const y = originY + idx * (LEAF_NODE_H + SUB_GAP_Y);
    nodes.push({
      id: item.id, type: 'leafNode',
      position: { x, y },
      data: { label: item.name || item.label, skill: item },
    });
    edges.push({
      id: `e-fan-${parentId}-${item.id}`,
      source: parentId, target: item.id, type: 'smoothstep',
      sourceHandle: direction === 1 ? 'right-s' : 'left-s',
      targetHandle: direction === 1 ? 'left-t' : 'right-t',
      style: EDGE_STYLE_FAN,
    });
  });

  return { nodes, edges, width: LEAF_NODE_W, height: h };
}

function layoutFanGrid(
  parentId: string, items: any[], cols: number,
  originX: number, originY: number, direction: 1 | -1
): ClusterResult {
  const nodes: any[] = [];
  const edges: any[] = [];
  const numRows = Math.ceil(items.length / cols);
  const gridW = cols * LEAF_NODE_W + (cols - 1) * SUB_GAP_X;
  const gridH = numRows * LEAF_NODE_H + (numRows - 1) * SUB_GAP_Y;

  items.forEach((item, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = originX + col * (LEAF_NODE_W + SUB_GAP_X);
    const y = originY + row * (LEAF_NODE_H + SUB_GAP_Y);

    nodes.push({
      id: item.id, type: 'leafNode',
      position: { x, y },
      data: { label: item.name || item.label, skill: item },
    });
    edges.push({
      id: `e-grid-${parentId}-${item.id}`,
      source: parentId, target: item.id, type: 'smoothstep',
      sourceHandle: direction === 1 ? 'right-s' : 'left-s',
      targetHandle: direction === 1 ? 'left-t' : 'right-t',
      style: EDGE_STYLE_FAN,
    });
  });

  return { nodes, edges, width: gridW, height: gridH };
}

function layoutLabeledContainer(
  parentId: string, parentName: string, items: any[], cols: number,
  originX: number, originY: number, direction: 1 | -1
): ClusterResult {
  const nodes: any[] = [];
  const edges: any[] = [];
  const numRows = Math.ceil(items.length / cols);
  const innerGridW = cols * LEAF_NODE_W + (cols - 1) * SUB_GAP_X;
  const innerGridH = numRows * LEAF_NODE_H + (numRows - 1) * SUB_GAP_Y;
  const containerW = innerGridW + CONTAINER_PAD * 2;
  const containerH = innerGridH + CONTAINER_PAD * 2 + 20; 
  const containerId = `container-${parentId}`;

  nodes.push({
    id: containerId, type: 'containerNode',
    position: { x: originX - CONTAINER_PAD, y: originY - CONTAINER_PAD - 20 },
    data: { label: parentName, containerW, containerH },
    zIndex: -1, 
  });

  edges.push({
    id: `e-cont-${parentId}-${containerId}`,
    source: parentId, target: containerId, type: 'smoothstep',
    sourceHandle: direction === 1 ? 'right-s' : 'left-s',
    targetHandle: direction === 1 ? 'left-t' : 'right-t',
    style: EDGE_STYLE_FAN,
  });

  items.forEach((item, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = originX + col * (LEAF_NODE_W + SUB_GAP_X);
    const y = originY + row * (LEAF_NODE_H + SUB_GAP_Y);

    nodes.push({
      id: item.id, type: 'leafNode',
      position: { x, y },
      data: { label: item.name || item.label, skill: item },
    });
  });

  return { nodes, edges, width: containerW, height: containerH };
}

// ── MAIN LAYOUT ENGINE ────────────────────────────────────────────────────────
function generateRoadmapLayout(
  skills: any[], edges: any[],
  _completedIds: Set<string>, _activeId: string | null
) {
  const layoutNodes: any[] = [];
  const flowEdges: any[] = [];

  if (!skills || skills.length === 0) return { nodes: [], edges: [] };

  const hasCatHierarchy = skills.some(s => s.id && s.id.includes('_cat_'));

  if (!hasCatHierarchy) {
    // 1. Build adjacency maps
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    const skillMap: Record<string, any> = {};

    skills.forEach(s => {
      skillMap[s.id] = s;
      adj[s.id] = [];
      inDegree[s.id] = 0;
    });

    edges.forEach(e => {
      const src = e.source_id || e.source;
      const tgt = e.target_id || e.target;
      if (adj[src] && inDegree[tgt] !== undefined) {
        adj[src].push(tgt);
        inDegree[tgt] = (inDegree[tgt] || 0) + 1;
      }
    });

    // 2. Compute layer depths using topological traversal
    const depth: Record<string, number> = {};
    const queue: string[] = [];

    skills.forEach(s => {
      if ((inDegree[s.id] || 0) === 0) {
        depth[s.id] = 0;
        queue.push(s.id);
      }
    });

    if (queue.length === 0 && skills.length > 0) {
      depth[skills[0].id] = 0;
      queue.push(skills[0].id);
    }

    const visited = new Set<string>();
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr)) continue;
      visited.add(curr);

      const currDepth = depth[curr] || 0;
      for (const neighbor of (adj[curr] || [])) {
        depth[neighbor] = Math.max(depth[neighbor] || 0, currDepth + 1);
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    // Ensure all skills have a depth
    skills.forEach(s => {
      if (depth[s.id] === undefined) {
        depth[s.id] = 0;
      }
    });

    // Group skills by depth
    const layers: Record<number, any[]> = {};
    skills.forEach(s => {
      const d = depth[s.id] || 0;
      if (!layers[d]) layers[d] = [];
      layers[d].push(s);
    });

    const maxDepth = Math.max(...Object.keys(layers).map(Number), 0);
    let currentY = 80;

    for (let d = 0; d <= maxDepth; d++) {
      const layerSkills = layers[d] || [];
      const count = layerSkills.length;
      if (count === 0) continue;

      const totalW = count * SPINE_NODE_W + (count - 1) * 60;
      const startX = CENTER_X - totalW / 2;

      layerSkills.forEach((sk, idx) => {
        const x = startX + idx * (SPINE_NODE_W + 60);
        const y = currentY;
        layoutNodes.push({
          id: sk.id,
          type: 'spineNode',
          position: { x, y },
          data: { label: sk.name || sk.label || sk.id, skill: sk },
        });
      });

      currentY += SPINE_NODE_H + SPINE_GAP + 30;
    }

    // Generate flow edges
    edges.forEach(e => {
      const src = e.source_id || e.source;
      const tgt = e.target_id || e.target;
      flowEdges.push({
        id: `e-${src}-${tgt}`,
        source: src,
        target: tgt,
        type: 'smoothstep',
        sourceHandle: 'bottom',
        targetHandle: 'top',
        style: { stroke: '#141413', strokeWidth: 2.5 },
      });
    });

    return { nodes: layoutNodes, edges: flowEdges };
  }

  const childrenOf: Record<string, string[]> = {};
  edges.forEach(e => {
    const src = e.source_id || e.source;
    const tgt = e.target_id || e.target;
    if (!childrenOf[src]) childrenOf[src] = [];
    childrenOf[src].push(tgt);
  });

  const mainNodes = skills
    .filter(s => s.id.includes('_cat_'))
    .sort((a, b) => {
      const na = parseInt(a.id.match(/_cat_(\d+)/)?.[1] || '0');
      const nb = parseInt(b.id.match(/_cat_(\d+)/)?.[1] || '0');
      return na - nb;
    });

  const subsByParent: Record<string, any[]> = {};
  skills.filter(s => s.id.includes('_sub_')).forEach(s => {
    const parentNum = s.id.match(/_sub_(\d+)_/)?.[1];
    if (parentNum) {
      const parent = mainNodes.find(m => m.id.match(/_cat_(\d+)/)?.[1] === parentNum);
      if (parent) {
        if (!subsByParent[parent.id]) subsByParent[parent.id] = [];
        subsByParent[parent.id].push(s);
      }
    }
  });

  let leftTotal = 0;
  let rightTotal = 0;
  let y = 60;

  for (let i = 0; i < mainNodes.length; i++) {
    const mn = mainNodes[i];
    const subs = (subsByParent[mn.id] || []).slice().sort((a, b) => {
      const na = parseInt(a.id.match(/_sub_\d+_(\d+)/)?.[1] || '0');
      const nb = parseInt(b.id.match(/_sub_\d+_(\d+)/)?.[1] || '0');
      return na - nb;
    });

    const classification = classifyGroup(mn, subs);
    const direction: 1 | -1 = leftTotal <= rightTotal ? -1 : 1;

    let clusterW = 0;
    let clusterH = 0;

    if (classification.type === 'FAN_LIST') {
      clusterH = classification.items.length * (LEAF_NODE_H + SUB_GAP_Y) - SUB_GAP_Y;
      clusterW = LEAF_NODE_W;
    } else if (classification.type === 'FAN_GRID' || classification.type === 'LABELED_CONTAINER') {
      const cols = classification.cols;
      const numRows = Math.ceil(classification.items.length / cols);
      clusterW = cols * LEAF_NODE_W + (cols - 1) * SUB_GAP_X;
      clusterH = numRows * LEAF_NODE_H + (numRows - 1) * SUB_GAP_Y;
      if (classification.type === 'LABELED_CONTAINER') {
        clusterW += CONTAINER_PAD * 2;
        clusterH += CONTAINER_PAD * 2 + 20;
      }
    }

    const blockH = Math.max(SPINE_NODE_H, clusterH);
    const spineY = y + blockH / 2 - SPINE_NODE_H / 2;

    layoutNodes.push({
      id: mn.id, type: 'spineNode',
      position: { x: CENTER_X - SPINE_NODE_W / 2, y: spineY },
      data: { label: mn.name || mn.label, skill: mn },
    });

    if (classification.items.length > 0) {
      const clusterOriginX = direction === 1
        ? CENTER_X + SPINE_NODE_W / 2 + FAN_MARGIN
        : CENTER_X - SPINE_NODE_W / 2 - FAN_MARGIN - clusterW
          + (classification.type === 'LABELED_CONTAINER' ? CONTAINER_PAD : 0);

      const clusterOriginY = y + blockH / 2 - clusterH / 2
        + (classification.type === 'LABELED_CONTAINER' ? CONTAINER_PAD + 20 : 0);

      let result: ClusterResult;

      switch (classification.type) {
        case 'FAN_LIST':
          result = layoutFanList(mn.id, classification.items, clusterOriginX, clusterOriginY, direction);
          break;
        case 'FAN_GRID':
          result = layoutFanGrid(mn.id, classification.items, classification.cols, clusterOriginX, clusterOriginY, direction);
          break;
        case 'LABELED_CONTAINER':
          result = layoutLabeledContainer(mn.id, mn.name, classification.items, classification.cols, clusterOriginX, clusterOriginY, direction);
          break;
        default:
          result = layoutFanGrid(mn.id, classification.items, 2, clusterOriginX, clusterOriginY, direction);
      }

      layoutNodes.push(...result.nodes);
      flowEdges.push(...result.edges);

      if (direction === -1) leftTotal += clusterW;
      else rightTotal += clusterW;
    }

    if (i < mainNodes.length - 1) {
      flowEdges.push({
        id: `e-spine-${mn.id}-${mainNodes[i + 1].id}`,
        source: mn.id, target: mainNodes[i + 1].id,
        type: 'smoothstep',
        sourceHandle: 'bottom', targetHandle: 'top',
        style: { stroke: '#141413', strokeWidth: 3 },
      });
    }

    y += blockH + SPINE_GAP;
  }

  return { nodes: layoutNodes, edges: flowEdges };
}

// ── TOPIC DRAWER ──────────────────────────────────────────────────────────────
/**
 * Enterprise-grade implementation of TopicDrawer.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
function TopicDrawer({ node, slug, onClose, onAssess, onIde, onCoach }: any) {
  const status = node.status;
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';
  const topicName = node.name || node.label;

  const freeResources = [
    { type: 'Article', title: `Wikipedia - ${topicName}`, url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topicName)}` },
    { type: 'Article', title: `What is ${topicName}?`, url: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(topicName)}` },
    { type: 'Video', title: `How ${topicName} works`, url: `https://www.youtube.com/results?search_query=how+${encodeURIComponent(topicName)}+works` }
  ];

  const keyConcepts = [
    "Core fundamentals & terminology",
    "Real-world implementation patterns",
    "Common pitfalls and debugging"
  ];

  return (
    <div className="absolute top-6 right-6 z-40 flex flex-col overflow-y-auto rounded-xl"
      style={{ width: 340, maxHeight: 'calc(100% - 48px)', background: '#faf9f5', border: '1px solid #d6d3c4',
        boxShadow: '0 8px 32px rgba(20,20,19,0.12)', animation: 'fadeIn 0.2s ease' }}>
      
      {/* HEADER */}
      <div className="p-4 border-b border-aven-border bg-aven-base sticky top-0 z-10 flex items-start justify-between">
        <div>
          <h2 className="text-aven-text font-bold text-lg leading-snug">{topicName}</h2>
          {status && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-aven-text-muted">
              {isCompleted && <span className="flex items-center gap-1 text-aven-status-mastered bg-aven-surface px-1.5 py-0.5 rounded border border-aven-border"><CheckCircle2 size={10} /> MASTERED</span>}
              {isLocked && <span className="flex items-center gap-1 text-aven-status-locked bg-aven-surface px-1.5 py-0.5 rounded border border-aven-border"><Lock size={10} /> LOCKED</span>}
              {status === 'active' && <span className="flex items-center gap-1 text-aven-status-active bg-aven-surface px-1.5 py-0.5 rounded border border-aven-border"><div className="w-1.5 h-1.5 bg-aven-status-active rounded-full animate-pulse" /> ACTIVE MILESTONE</span>}
            </div>
          )}
        </div>
        <button onClick={onClose} className="p-1 -mr-1 mt-0.5 text-aven-text-muted hover:text-aven-text hover:bg-aven-surface rounded-md transition"><X size={16} /></button>
      </div>
      
      <div className="p-4 flex-1 flex flex-col gap-4">
        {/* DESCRIPTION */}
        <p className="text-[13px] text-aven-text-subtle leading-relaxed">
          {node.description || `${topicName} is a core prerequisite in the ${slug} learning path. Mastering this concept is critical for advancing to subsequent architectural milestones.`}
        </p>

        {/* LAUNCHPAD BOX */}
        <div className="border border-aven-border rounded-xl bg-aven-base p-3 shadow-sm">
          <div className="flex items-center gap-1.5 mb-3">
            <Command size={14} className="text-aven-text" />
            <h3 className="text-[13px] font-bold text-aven-text">Launchpad</h3>
          </div>
          {isLocked ? (
            <div className="bg-aven-surface border border-aven-border rounded-lg p-3 text-center">
              <Lock size={14} className="text-aven-text-muted mx-auto mb-1.5" />
              <p className="text-[11px] font-bold text-aven-text-subtle">Milestone Locked</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <button onClick={onIde} className="w-full py-2 px-3 rounded-md text-[11px] font-bold border border-aven-border bg-aven-base hover:bg-aven-surface text-aven-text flex items-center justify-between transition shadow-sm group">
                <div className="flex items-center gap-2"><MonitorPlay size={12} className="text-aven-text-muted group-hover:text-aven-text" /> Day-One Simulator</div>
                <ArrowRight size={10} className="text-aven-text-muted group-hover:text-aven-text" />
              </button>
              <button onClick={onCoach} className="w-full py-2 px-3 rounded-md text-[11px] font-bold border border-aven-border bg-aven-base hover:bg-aven-surface text-aven-text flex items-center justify-between transition shadow-sm group">
                <div className="flex items-center gap-2"><Mic size={12} className="text-aven-text-muted group-hover:text-aven-text" /> AI Mock Interview</div>
                <ArrowRight size={10} className="text-aven-text-muted group-hover:text-aven-text" />
              </button>
            </div>
          )}
        </div>

        {/* FREE RESOURCES BOX */}
        <div className="border border-aven-border rounded-xl bg-aven-base p-3 shadow-sm mb-2">
          <div className="flex items-center gap-1.5 mb-3">
            <Heart size={14} className="text-aven-text" />
            <h3 className="text-[13px] font-bold text-aven-text">Free Resources</h3>
          </div>
          <div className="flex flex-col gap-2">
            {freeResources.map((res, i) => (
              <a key={i} href={res.url} target="_blank" rel="noreferrer" 
                 className="flex items-center gap-2 p-1.5 -mx-1.5 rounded-md hover:bg-aven-surface transition group">
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-aven-surface text-aven-text border-aven-border shrink-0">
                  {res.type}
                </span>
                <span className="text-[12px] font-medium text-aven-text-subtle group-hover:text-aven-text transition truncate underline decoration-aven-border underline-offset-2 group-hover:decoration-aven-text-subtle">
                  {res.title}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE WRAPPER & INNER ────────────────────────────────────────────────
/**
 * Enterprise-grade implementation of GraphInner.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
function GraphInner() {
  const { setCenter } = useReactFlow();
  const [viewMode, setViewMode] = useState<'graph' | 'roadmap'>('roadmap');
  const [selectedRoadmap, setSelectedRoadmap] = useState('backend');
  const [loading, setLoading] = useState(true);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<any>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<any>([]);

  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);

  const { data: activePathData, isLoading: isActivePathLoading } = useActivePathQuery();
  const learnerNodes = activePathData?.nodes;
  const learnerEdges = activePathData?.edges;
  const openIde = usePathStore((s) => s.openIde);
  const openCoach = usePathStore((s) => s.openCoach);

  useEffect(() => {
    if (viewMode === 'roadmap') loadRoadmap(selectedRoadmap);
    else if (learnerNodes && learnerNodes.length > 0) {
      const mapped = learnerNodes.map((n: any) => ({ ...n.data, id: n.id, name: n.data.label }));
        buildAndSetLayout(mapped, learnerEdges || []);
    }
  }, [selectedRoadmap, viewMode, learnerNodes]);

  const buildAndSetLayout = (skills: any[], edges: any[]) => {
    const { nodes, edges: newEdges } = generateRoadmapLayout(skills, edges, new Set(), null);
    setRfNodes(nodes);
    setRfEdges(newEdges);
  };

  // Smart Initial Panning
  useEffect(() => {
    if (rfNodes.length > 0 && (!loading || viewMode === 'graph' && !isActivePathLoading)) {
      // Use requestAnimationFrame or a small timeout to ensure ReactFlow has mounted the nodes
      setTimeout(() => {
        let targetNode = null;
        if (viewMode === 'graph') {
          // 1. guarantee to find the active milestone
          targetNode = rfNodes.find((n: any) => n.data?.skill?.status === 'active' || n.data?.status === 'active');
        }
        
        // 2. Fallback to the first spine node (top of the roadmap)
        if (!targetNode) {
          targetNode = rfNodes.find((n: any) => n.type === 'spineNode');
        }

        if (targetNode) {
          // Zoom out to 0.55 so the wide horizontal leaf clusters aren't cut off on the sides.
          // Increase Y offset to +350 to ensure the first node still sits comfortably in the upper half.
          setCenter(targetNode.position.x, targetNode.position.y + 350, { duration: 1200, zoom: 0.55 });
        }
      }, 100);
    }
  }, [rfNodes, viewMode, loading, isActivePathLoading, setCenter]);

  const loadRoadmap = async (slug: string) => {
    setLoading(true);
    try {
      const data = await learnerRoadmapGraph(slug);
      buildAndSetLayout(data.skills || [], data.edges || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const onNodeClick = useCallback((_: any, node: any) => {
    if (node.data?.skill) {
      setSelectedNode(node.data.skill);
      // Fluid Motion: Smoothly pan to the node instead of jarring the user
      setCenter(node.position.x + 100, node.position.y, { duration: 800, zoom: 0.8 });
    }
  }, [setCenter]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-aven-base -m-6 md:-m-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="border-b border-aven-border bg-aven-base shrink-0 z-10 relative px-6 md:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-aven-text" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-aven-text-muted">Skill Graph Explorer</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-medium text-aven-text tracking-tight">
            Curriculum Topology
          </h1>
          
          <div className="flex items-center bg-aven-surface p-1 rounded-lg border border-aven-border">
            <button onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'graph' ? 'bg-aven-primary text-aven-base shadow-sm' : 'text-aven-text-muted hover:text-aven-text'}`}>
              <Network size={14} /><span>My Graph</span>
            </button>
            <button onClick={() => setViewMode('roadmap')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'roadmap' ? 'bg-aven-primary text-aven-base shadow-sm' : 'text-aven-text-muted hover:text-aven-text'}`}>
              <Map size={14} /><span>Roadmaps</span>
            </button>
          </div>
        </div>

        {viewMode === 'roadmap' && (
          <div className="flex items-center gap-2 mt-6 overflow-x-auto">
            {ROADMAPS.map(r => {
              const active = selectedRoadmap === r.slug;
              return (
                <button key={r.slug} onClick={() => setSelectedRoadmap(r.slug)}
                  className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition shrink-0 border ${
                    active 
                      ? 'bg-aven-primary text-aven-base border-aven-primary shadow-sm' 
                      : 'bg-aven-base text-aven-text-muted border-aven-border hover:border-aven-text-muted hover:text-aven-text'
                  }`}>
                  {r.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative w-full h-full bg-aven-base">
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-aven-base/80 backdrop-blur-sm">
            <div className="text-sm font-bold tracking-widest uppercase text-aven-text-muted animate-pulse">Computing Layout...</div>
          </div>
        )}
        <ReactFlow
          nodes={rfNodes} edges={rfEdges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick} nodeTypes={nodeTypes}
          minZoom={0.1} maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable
        >
          <Background color="#d6d3c4" gap={28} size={1} />
          <Controls className="bg-white border border-aven-border rounded overflow-hidden shadow-sm" />
        </ReactFlow>

        {selectedNode && (
          <TopicDrawer node={selectedNode} slug={selectedRoadmap}
            onClose={() => setSelectedNode(null)}
            onAssess={() => setIsAssessmentOpen(true)}
            onIde={() => openIde(selectedNode.id || selectedNode.name)}
            onCoach={() => openCoach(selectedNode.id || selectedNode.name)} />
        )}
      </div>

      {/* Assessment Modal */}
      {isAssessmentOpen && (
        <div className="fixed inset-0 z-50 bg-aven-text/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-aven-base border border-aven-border rounded-2xl p-6 max-w-xl w-full shadow-2xl relative">
            <button onClick={() => setIsAssessmentOpen(false)} className="absolute top-4 right-4 text-aven-text-muted hover:text-aven-text">
              <X size={20} />
            </button>
            <ProveItAssessment milestoneId={selectedNode?.id || ''} />
          </div>
        </div>
      )}
      <AiCoachDrawer />
    </div>
  );
}

/**
 * Enterprise-grade implementation of GraphPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function GraphPage() {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  );
}
