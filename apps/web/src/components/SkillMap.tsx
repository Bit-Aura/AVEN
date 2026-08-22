'use client';

import React from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge } from '@xyflow/react';

const initialNodes: Node[] = [
  {
    id: '1',
    position: { x: 250, y: 0 },
    data: { label: 'Python Programming (Core)' },
    style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #3b82f6', borderRadius: '8px', padding: '10px' },
  },
  {
    id: '2',
    position: { x: 100, y: 150 },
    data: { label: 'FastAPI Backend Development' },
    style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #10b981', borderRadius: '8px', padding: '10px' },
  },
  {
    id: '3',
    position: { x: 400, y: 150 },
    data: { label: 'SQLAlchemy & Databases' },
    style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #8b5cf6', borderRadius: '8px', padding: '10px' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3', animated: true },
];

export default function SkillMap() {
  return (
    <div className="w-full h-[500px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        fitView
      >
        <Background color="#334155" gap={16} />
        <Controls />
        <MiniMap
          style={{ background: '#0f172a', border: '1px solid #334155' }}
          nodeColor={() => '#3b82f6'}
        />
      </ReactFlow>
    </div>
  );
}
