'use client';

import { useState, useEffect } from 'react';
import { usePathStore } from '../../store/usePathStore';
import { 
  TerminalWindow, 
  ShieldCheck
} from '@phosphor-icons/react';

interface CurrentNodeCardProps {
  nodeName?: string;
  whyThisStep?: string;
  whatIfSkip?: string;
  onStartAssessment?: (skillId: string) => void;
}

export default function CurrentNodeCard({ 
  nodeName, 
  whyThisStep, 
  whatIfSkip,
  onStartAssessment 
}: CurrentNodeCardProps) {
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const pathExplanation = usePathStore((state) => state.pathExplanation);
  const openIde = usePathStore((state) => state.openIde);
  const startAssessment = usePathStore((state) => state.startAssessment);
  const profileId = usePathStore((state) => state.profileId);

  const currentSkillId = activeMilestone?.id || nodeName || 'python_basics';
  const displayTitle = activeMilestone?.title || (nodeName ? nodeName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Design RESTful APIs');
  const displayWhy = activeMilestone?.explanation || pathExplanation || whyThisStep || 'Outstanding achievement! You have mastered all prerequisite milestones for this path.';

  const handleAssessmentTrigger = () => {
    if (onStartAssessment) {
      onStartAssessment(currentSkillId);
    } else {
      startAssessment();
    }
  };

  return (
    <div className="bg-[#e8e6dc] border border-[#d6d3c4] text-[#141413] rounded-2xl p-8 relative overflow-hidden flex flex-col gap-8">
      {/* Header & Milestone Status */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-[#d6d3c4] pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#141413]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#141413]">Current Milestone</span>
          </div>
          <h2 className="text-3xl font-medium text-[#141413] tracking-tight mb-4">
            {displayTitle}
          </h2>
          <div className="text-sm text-[#3d3d3a] max-w-xl leading-relaxed">
            {displayWhy}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => openIde(currentSkillId)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3d3d3a] hover:opacity-90 text-white text-xs font-bold transition-opacity"
          >
            <TerminalWindow size={16} weight="bold" />
            <span>Sandbox IDE</span>
          </button>
          <button
            onClick={handleAssessmentTrigger}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3d3d3a] hover:opacity-90 text-white text-xs font-bold transition-opacity"
          >
            <ShieldCheck size={16} weight="bold" />
            <span>Prove It</span>
          </button>
        </div>
      </div>
    </div>
  );
}
