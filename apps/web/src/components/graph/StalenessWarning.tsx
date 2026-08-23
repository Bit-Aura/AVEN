export default function StalenessWarning({ nodeName, daysStale }: { nodeName: string, daysStale: number }) {
  return (
    <div className="bg-neo-yellow border-4 border-black p-6 shadow-brutal flex flex-col gap-4">
      <h3 className="text-2xl font-black uppercase flex items-center gap-2">
        <span>⚠️</span> Skill Decay Detected
      </h3>
      <p className="text-lg font-bold">
        You haven't practiced <strong>{nodeName}</strong> in {daysStale} days. 
        Before you can proceed to the dependent skill, you must complete a quick warm-up.
      </p>
      <button className="bg-neo-red text-white border-4 border-black text-xl font-black uppercase py-3 shadow-brutal hover:shadow-brutal-active hover:translate-y-1 hover:translate-x-1 transition-all">
        Start Warm-Up
      </button>
    </div>
  );
}
