'use client';

import { useEffect, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, addEdge, Connection, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePathStore } from '../store/usePathStore';
import SkillNode from './SkillNode';
import FailureHeatmapOverlay from './graph/FailureHeatmapOverlay';

const nodeTypes = {
  custom: SkillNode,
  default: SkillNode,
  input: SkillNode,
  output: SkillNode
};

export default function SkillGraph() {
  const storeNodes = usePathStore((state) => state.nodes);
  const storeEdges = usePathStore((state) => state.edges);
  const isSimulatingSkip = usePathStore((state) => state.isSimulatingSkip);

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  useEffect(() => {
    setNodes(storeNodes);
    setEdges(storeEdges);
  }, [storeNodes, storeEdges, setNodes, setEdges]);
  
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div className={`w-full h-[600px] border rounded-2xl overflow-hidden bg-[#0d1117] transition-all duration-500 relative ${
      isSimulatingSkip ? 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.15)]' : 'border-[#30363d]'
    }`}>
      {/* Immersive radial gradient for focus area */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0d1117]/50 to-[#0d1117] pointer-events-none z-0" />
      <FailureHeatmapOverlay />
      {isSimulatingSkip && (
        <div className="absolute top-4 left-4 z-10 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded shadow-lg animate-pulse">
          SIMULATING ALTERNATIVE PATH
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="dark"
      >
        <Background color="#30363d" gap={20} size={1.5} />
        <Controls className="bg-slate-900 border-slate-700 fill-slate-200" />
        <MiniMap nodeColor="#475569" maskColor="rgba(15, 23, 42, 0.7)" />
      </ReactFlow>
    </div>
  );
}
