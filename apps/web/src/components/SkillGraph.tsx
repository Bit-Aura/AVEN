'use client';

import { useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, addEdge, Connection, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePathStore } from '../store/usePathStore';

const initialNodes: Node[] = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Python Basics' }, type: 'input' },
  { id: '2', position: { x: 0, y: 100 }, data: { label: 'Data Structures' } },
];
const initialEdges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

export default function SkillGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const isSimulatingSkip = usePathStore((state) => state.isSimulatingSkip);
  
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div className={`w-full h-[500px] border-2 rounded-lg overflow-hidden bg-slate-950 transition-all duration-500 relative ${
      isSimulatingSkip ? 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.15)]' : 'border-slate-800'
    }`}>
      {isSimulatingSkip && (
        <div className="absolute top-4 left-4 z-10 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded shadow-lg animate-pulse">
          SIMULATING ALTERNATIVE PATH
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="dark"
      >
        <Background color="#334155" gap={16} />
        <Controls className="bg-slate-900 border-slate-700 fill-slate-200" />
        <MiniMap nodeColor="#475569" maskColor="rgba(15, 23, 42, 0.7)" />
      </ReactFlow>
    </div>
  );
}
