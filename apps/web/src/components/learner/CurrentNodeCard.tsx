'use client';

import { useState, useEffect } from 'react';
import { usePathStore } from '../../store/usePathStore';
import { 
  TerminalWindow, 
  ShieldCheck,
  Medal
} from '@phosphor-icons/react';
import { downloadCertificate } from '../../api/client';

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
  const displayTitle = activeMilestone?.title || (activeMilestone as any)?.data?.label || (nodeName ? nodeName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Design RESTful APIs');
  const displayWhy = activeMilestone?.explanation || pathExplanation || whyThisStep || 'Outstanding achievement! You have mastered all prerequisite milestones for this path.';
  
  const isCompleted = (activeMilestone as any)?.data?.status === 'completed' || activeMilestone?.status === 'completed';
  const [isDownloading, setIsDownloading] = useState(false);

  const handleClaimCertificate = async () => {
    setIsDownloading(true);
    try {
      await downloadCertificate(profileId || 1, displayTitle, currentSkillId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAssessmentTrigger = () => {
    if (onStartAssessment) {
      onStartAssessment(currentSkillId);
    } else {
      startAssessment();
    }
  };

  return (
    <div className="bg-aven-primary border border-aven-primary text-aven-base rounded-2xl p-8 relative overflow-hidden flex flex-col gap-8 shadow-lg">
      {/* Header & Milestone Status */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-aven-status-active animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-aven-text-muted">Current Milestone</span>
          </div>
          <h2 className="text-3xl font-medium text-aven-base tracking-tight mb-4">
            {displayTitle}
          </h2>
          <div className="text-sm text-aven-surface max-w-xl leading-relaxed">
            {displayWhy}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <button
            onClick={handleClaimCertificate}
            disabled={isDownloading}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3d3d3a] hover:opacity-90 text-aven-base text-xs font-bold transition-opacity disabled:opacity-50"
          >
            <Medal size={16} weight="bold" />
            <span>{isDownloading ? 'Generating...' : 'Claim Certificate'}</span>
          </button>
          <button
            onClick={() => openIde(currentSkillId)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-aven-status-active hover:brightness-110 text-aven-text text-xs font-black transition-all border border-aven-status-active"
          >
            <TerminalWindow size={16} weight="bold" />
            <span>Sandbox IDE</span>
          </button>
          <button
            onClick={handleAssessmentTrigger}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2b2b2a] hover:brightness-110 text-aven-base text-xs font-black transition-all"
          >
            <ShieldCheck size={16} weight="bold" />
            <span>Prove It</span>
          </button>
        </div>
      </div>
    </div>
  );
}
