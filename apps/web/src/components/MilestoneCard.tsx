import { Milestone, usePathStore } from '../store/usePathStore';

interface MilestoneCardProps {
  milestone: Milestone;
}

export default function MilestoneCard({ milestone }: MilestoneCardProps) {
  const isSimulatingSkip = usePathStore((state) => state.isSimulatingSkip);
  const simulatedConsequence = usePathStore((state) => state.simulatedConsequence);
  const simulateSkip = usePathStore((state) => state.simulateSkip);
  const cancelSimulation = usePathStore((state) => state.cancelSimulation);

  return (
    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-xl max-w-md w-full transition-all">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold text-slate-100">{milestone.title}</h2>
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
          {milestone.status.toUpperCase()}
        </span>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed mb-6">
        {milestone.explanation}
      </p>
      <div className="flex gap-4">
        <button className="flex-1 bg-slate-100 text-slate-900 font-bold py-2 rounded hover:bg-white transition-colors">
          Start Milestone
        </button>
        <button 
          onClick={() => isSimulatingSkip ? cancelSimulation() : simulateSkip(milestone.id)}
          className={`px-4 py-2 font-bold rounded transition-colors ${
            isSimulatingSkip 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30' 
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300'
          }`}
        >
          {isSimulatingSkip ? 'Cancel Skip' : 'What if I skip this?'}
        </button>
      </div>

      {isSimulatingSkip && (
        <div className="mt-6 p-4 bg-rose-950/30 border border-rose-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
          <h3 className="text-rose-400 font-bold mb-2 flex items-center gap-2">
            <span className="text-lg">⚠️</span> Simulation Consequence
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            {simulatedConsequence}
          </p>
          <div className="mt-4 flex gap-2 justify-end">
            <button className="px-3 py-1 text-xs font-bold text-rose-300 hover:text-rose-200 transition-colors">
              Commit to Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
