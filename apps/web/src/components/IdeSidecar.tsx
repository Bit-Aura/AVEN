'use client';

import { usePathStore, ProofCardData } from '../store/usePathStore';
import { Play, CheckCircle, TerminalSquare } from 'lucide-react';
import { useState } from 'react';

export default function IdeSidecar() {
  const activeIdeNodeId = usePathStore((state) => state.activeIdeNodeId);
  const closeIde = usePathStore((state) => state.closeIde);
  const completeMilestoneViaIde = usePathStore((state) => state.completeMilestoneViaIde);
  const setCoachPraiseCard = usePathStore((state) => state.setCoachPraiseCard);
  const openCoach = usePathStore((state) => state.openCoach);

  const [code, setCode] = useState('// Write your solution here\n\nfunction solve() {\n  return true;\n}');
  const [output, setOutput] = useState<string | null>(null);
  
  const [runCount, setRunCount] = useState(0);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  if (!activeIdeNodeId) return null;

  const handleRun = async () => {
    setIsRunning(true);
    setRunCount(prev => prev + 1);
    const isPassing = runCount >= 1; // Fails first run, passes second run
    
    setOutput('Compiling...\nRunning tests...');
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const newSnapshot = {
      timestamp: new Date().toISOString(),
      codeDiff: '+ function solve() { return true; }',
      linesChanged: 3,
      testRan: true,
      testPassed: isPassing,
    };
    
    const updatedSnapshots = [...snapshots, newSnapshot];
    setSnapshots(updatedSnapshots);
    
    if (isPassing) {
      setOutput('Compiling...\nRunning tests...\nAll 3 tests passed! ✅');
      
      try {
        const res = await fetch('/api/v1/diagnostics/debug-telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSnapshots)
        });
        const data = await res.json();
        
        if (data.praise) {
           setCoachPraiseCard({ message: data.praise, badge: data.badge });
           openCoach(activeIdeNodeId);
        }
      } catch (e) {
        // Mock fallback if backend isn't ready
        const mockBadge: ProofCardData = {
          skillName: "Debugging Mastery",
          confidenceScore: 92,
          evidenceTags: ["Surgical Debugging", "Efficient Fix", "No Thrashing"],
          narrative: "Demonstrated systematic debugging by analyzing test failures and applying targeted fixes rather than random thrashing.",
          issueDate: new Date().toLocaleDateString()
        };
        setCoachPraiseCard({ 
          message: "You isolated the bug in 2 surgical steps rather than random thrashing. Excellent methodical approach!", 
          badge: mockBadge 
        });
        openCoach(activeIdeNodeId);
      }
    } else {
      setOutput('Compiling...\nRunning tests...\nFailed: Expected true but got false ❌\nTip: Try looking at the return statement.');
    }
    
    setIsRunning(false);
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
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-[#333] hover:bg-[#444] disabled:opacity-50 text-white rounded text-sm transition-colors"
        >
          <Play size={16} /> {isRunning ? 'Running...' : 'Run Code'}
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
