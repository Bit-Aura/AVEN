'use client';

import { usePathStore } from '../store/usePathStore';

interface ProveItAssessmentProps {
  milestoneId: string;
}

export default function ProveItAssessment({ milestoneId }: ProveItAssessmentProps) {
  const stopAssessment = usePathStore((state) => state.stopAssessment);
  const bypassMilestone = usePathStore((state) => state.bypassMilestone);

  // Mock question for the MVP frontend
  const mockQuestion = {
    text: "Which of the following is the correct way to define a function in Python?",
    options: [
      { id: 'a', text: "function myFunc() {}", isCorrect: false },
      { id: 'b', text: "def my_func():", isCorrect: true },
      { id: 'c', text: "void myFunc() {}", isCorrect: false },
    ]
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      // For MVP, bypassing simply completes it
      bypassMilestone(milestoneId);
    } else {
      // If they fail, just close the assessment so they have to take the milestone
      stopAssessment();
      alert("Not quite! Looks like you should take this milestone to solidify your understanding.");
    }
  };

  return (
    <div className="mt-6 p-5 bg-slate-950 border-2 border-emerald-500/50 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-in fade-in zoom-in-95">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-emerald-400 font-bold flex items-center gap-2">
          <span className="text-xl">🎓</span> Prove Your Knowledge
        </h3>
        <button 
          onClick={stopAssessment}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Cancel Assessment"
        >
          ✕
        </button>
      </div>
      
      <p className="text-slate-200 mb-4 font-medium leading-relaxed">
        {mockQuestion.text}
      </p>

      <div className="flex flex-col gap-3">
        {mockQuestion.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleAnswer(opt.isCorrect)}
            className="w-full text-left p-3 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-emerald-500/50 transition-all text-slate-300 hover:text-slate-100"
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
