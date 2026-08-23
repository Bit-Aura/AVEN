'use client';

import { useState, useEffect } from 'react';
import { usePathStore } from '../store/usePathStore';

interface ProveItAssessmentProps {
  milestoneId: string;
}

export default function ProveItAssessment({ milestoneId }: ProveItAssessmentProps) {
  const { 
    bypassMilestone, 
    stopAssessment, 
    activeMilestone, 
    fetchAssessment,
    currentAssessment,
    isFetchingAssessment
  } = usePathStore();
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);

  useEffect(() => {
    if (milestoneId) {
      fetchAssessment(milestoneId);
    }
  }, [milestoneId, fetchAssessment]);

  const handleAnswer = () => {
    if (selectedOpt) {
      bypassMilestone(milestoneId, selectedOpt);
    }
  };

  return (
    <div className="mt-6 p-5 bg-slate-950 border-2 border-emerald-500/50 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-in fade-in zoom-in-95">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-emerald-400 font-bold flex items-center gap-2">
          <span className="text-xl">🎓</span> {activeMilestone?.title} Checkpoint
        </h3>
        <button 
          onClick={stopAssessment}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Cancel Assessment"
        >
          ✕
        </button>
      </div>
      
      {isFetchingAssessment ? (
        <div className="flex justify-center items-center py-10">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : currentAssessment ? (
        <>
          <p className="text-slate-200 mb-6 font-medium leading-relaxed">
            {currentAssessment.question}
          </p>
          <div className="space-y-3">
            {currentAssessment.options.map((opt: string, i: number) => (
              <button 
                key={i}
                onClick={() => setSelectedOpt(opt)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedOpt === opt 
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-100' 
                    : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button 
              onClick={handleAnswer}
              disabled={!selectedOpt}
              className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Submit Answer
            </button>
          </div>
        </>
      ) : (
        <p className="text-slate-300">Assessment not available.</p>
      )}
    </div>
  );
}
