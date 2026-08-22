import { Milestone } from '../store/usePathStore';

interface MilestoneCardProps {
  milestone: Milestone;
}

export default function MilestoneCard({ milestone }: MilestoneCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-md w-full">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold text-slate-100">{milestone.title}</h2>
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
          {milestone.status.toUpperCase()}
        </span>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed mb-6">
        {milestone.explanation}
      </p>
      <button className="w-full bg-slate-100 text-slate-900 font-bold py-2 rounded hover:bg-white transition-colors">
        Start Milestone
      </button>
    </div>
  );
}
