import React from 'react';
import { Lightbulb, BookOpen, Layers, CheckCircle } from 'lucide-react';
import { CodingQuestionResponse } from '../../../api/client';

interface IdeChallengePanelProps {
  challenge: CodingQuestionResponse | null;
  activeTab: 'problem' | 'examples' | 'hints' | 'evaluation';
  setActiveTab: (tab: 'problem' | 'examples' | 'hints' | 'evaluation') => void;
  showHints: boolean[];
  setShowHints: (hints: boolean[]) => void;
  isGenerating: boolean;
}

export function IdeChallengePanel({ challenge, activeTab, setActiveTab, showHints, setShowHints, isGenerating }: IdeChallengePanelProps) {
  if (isGenerating) {
    return <div className="p-4 text-white/50 animate-pulse">Generating personalized challenge...</div>;
  }
  
  if (!challenge) {
    return <div className="p-4 text-white/50">No challenge available.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#161b22]">
      <div className="flex border-b border-white/10">
        {(['problem', 'examples', 'hints', 'evaluation'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium capitalize ${activeTab === tab ? 'text-white border-b-2 border-indigo-500' : 'text-white/50 hover:text-white/80'}`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-auto p-4 text-sm text-white/80 leading-relaxed">
        {activeTab === 'problem' && (
          <div>
            <h2 className="text-lg font-bold text-white mb-2">{challenge.title}</h2>
            <div className="prose prose-invert max-w-none">{challenge.problem_statement}</div>
          </div>
        )}
        
        {activeTab === 'examples' && (
          <div className="space-y-4">
            {challenge.examples?.map((ex, idx) => (
              <div key={idx} className="bg-black/30 p-3 rounded-lg border border-white/5">
                <div className="font-mono text-xs text-white/60 mb-1">Input:</div>
                <div className="font-mono text-sm text-white mb-3">{ex.input}</div>
                <div className="font-mono text-xs text-white/60 mb-1">Output:</div>
                <div className="font-mono text-sm text-green-400">{ex.output}</div>
                {ex.explanation && (
                  <div className="mt-2 text-xs text-white/50 italic border-t border-white/10 pt-2">{ex.explanation}</div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'hints' && (
          <div className="space-y-2">
            {challenge.hints?.map((hint, idx) => (
              <div key={idx} className="border border-white/10 rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    const newHints = [...showHints];
                    newHints[idx] = !newHints[idx];
                    setShowHints(newHints);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
                >
                  <span className="font-medium text-white/80 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Hint {idx + 1}
                  </span>
                </button>
                {showHints[idx] && (
                  <div className="p-3 bg-black/20 text-white/70 border-t border-white/10 prose prose-invert prose-sm">
                    {hint}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
