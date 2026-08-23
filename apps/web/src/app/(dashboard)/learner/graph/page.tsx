'use client';

import { ReactFlow, Controls, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import StalenessWarning from '../../../../components/graph/StalenessWarning';

// Stub data for the graph
const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'HTTP Methods' }, style: { border: '4px solid black', background: '#22c55e', fontWeight: 'bold' } },
  { id: '2', position: { x: 0, y: 100 }, data: { label: 'REST API Design (Stale)' }, style: { border: '4px solid black', background: '#eab308', fontWeight: 'bold' } },
  { id: '3', position: { x: 0, y: 200 }, data: { label: 'FastAPI Basics' }, style: { border: '4px solid black', background: '#ffffff', fontWeight: 'bold' } },
];
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'black', strokeWidth: 4 } },
  { id: 'e2-3', source: '2', target: '3', style: { stroke: 'black', strokeWidth: 4 } },
];

export default function GraphPage() {
  return (
    <div className="min-h-screen bg-neo-bg flex flex-col p-8 gap-8">
      <header className="border-b-8 border-black pb-4">
        <h1 className="text-4xl font-black uppercase">Your Skill Graph</h1>
        <p className="text-xl font-bold mt-2">Visualize your deterministic learning path.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        <div className="flex-1 bg-white border-8 border-black shadow-brutal relative min-h-[500px]">
          <ReactFlow nodes={initialNodes} edges={initialEdges} fitView>
            <Background color="#000" gap={16} />
            <Controls className="border-4 border-black" />
          </ReactFlow>
        </div>

        <aside className="w-full lg:w-96">
          <StalenessWarning nodeName="REST API Design" daysStale={14} />
        </aside>
      </div>
    </div>
  );
}
