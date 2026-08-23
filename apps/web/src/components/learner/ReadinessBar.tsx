export default function ReadinessBar({ percentage }: { percentage: number }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="text-2xl font-black uppercase">
        Readiness: <span className="bg-neo-green px-2 border-4 border-black shadow-brutal">{percentage}%</span>
      </div>
      <p className="text-sm font-bold text-gray-700 max-w-xs text-right">
        *Based on verified micro-assessments, not video watch time.
      </p>
    </div>
  );
}
