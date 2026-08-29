import React from 'react';
import { Loader2, TerminalSquare } from 'lucide-react';

interface IdeOutputProps {
  output: string | null;
  isRunning: boolean;
}

export function IdeOutput({ output, isRunning }: IdeOutputProps) {
  return (
    <div className="flex-1 min-h-0 bg-[#0d1117] border-t border-white/10 flex flex-col relative group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-white/5">
        <div className="flex items-center gap-2 text-xs font-medium text-white/50">
          <TerminalSquare className="w-3.5 h-3.5" />
          TERMINAL
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 font-mono text-xs">
        {isRunning ? (
          <div className="flex items-center gap-2 text-amber-400/80">
            <Loader2 className="w-4 h-4 animate-spin" />
            Executing code in sandbox...
          </div>
        ) : output ? (
          <pre className="text-white/80 whitespace-pre-wrap font-mono leading-relaxed">
            {output}
          </pre>
        ) : (
          <div className="text-white/30 italic">No output yet. Run your code to see results.</div>
        )}
      </div>
    </div>
  );
}
