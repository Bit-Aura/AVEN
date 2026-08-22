'use client';

import { usePathStore } from '../store/usePathStore';
import { Play, CheckCircle, TerminalSquare } from 'lucide-react';
import { useState } from 'react';

export default function IdeSidecar() {
  const activeIdeNodeId = usePathStore((state) => state.activeIdeNodeId);
  const closeIde = usePathStore((state) => state.closeIde);
  const completeMilestoneViaIde = usePathStore((state) => state.completeMilestoneViaIde);

  const [code, setCode] = useState('// Write your solution here\n\nfunction solve() {\n  return true;\n}');
  const [output, setOutput] = useState<string | null>(null);

  if (!activeIdeNodeId) return null;

  const handleRun = () => {
    setOutput('Compiling...\nRunning tests...\nAll 3 tests passed! ✅');
  };

  const handleSubmit = () => {
    completeMilestoneViaIde(activeIdeNodeId);
  };

  return (
    <div className="absolute top-0 right-0 w-[600px] h-full bg-[#1e1e1e] border-l border-[#333] shadow-2xl flex flex-col animate-in slide-in-from-right z-50 text-[#d4d4d4] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <TerminalSquare size={18} className="text-[#4EC9B0]" />
          <span className="text-sm">IDE Environment</span>
        </div>
        <button onClick={closeIde} className="text-[#858585] hover:text-white">✕</button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col p-4 bg-[#1e1e1e] overflow-hidden">
        <div className="text-xs text-[#858585] mb-2 uppercase">index.ts</div>
        <textarea 
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 w-full bg-[#1e1e1e] text-[#d4d4d4] resize-none outline-none font-mono text-sm leading-relaxed"
          spellCheck={false}
        />
      </div>

      {/* Terminal/Output Area */}
      <div className="h-48 border-t border-[#333] bg-[#1e1e1e] flex flex-col">
        <div className="flex gap-4 px-4 py-2 text-xs border-b border-[#333] uppercase text-[#858585]">
          <span className="text-[#e7e7e7] border-b border-[#e7e7e7] pb-1 cursor-pointer">Terminal</span>
          <span className="cursor-pointer hover:text-[#e7e7e7]">Output</span>
        </div>
        <div className="p-4 flex-1 overflow-y-auto text-xs whitespace-pre text-[#4EC9B0]">
          {output || '> Ready.'}
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 border-t border-[#333] bg-[#252526] flex justify-end gap-3">
        <button 
          onClick={handleRun}
          className="flex items-center gap-2 px-4 py-2 bg-[#333] hover:bg-[#444] text-white rounded text-sm transition-colors"
        >
          <Play size={16} /> Run Code
        </button>
        <button 
          onClick={handleSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
        >
          <CheckCircle size={16} /> Submit Solution
        </button>
      </div>
    </div>
  );
}
