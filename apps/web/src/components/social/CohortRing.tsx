export default function CohortRing({ cohortName, members }: { cohortName: string, members: string[] }) {
  return (
    <div className="bg-white border-4 border-black p-4 shadow-brutal flex flex-col gap-4 max-w-sm">
      <h3 className="text-xl font-black uppercase border-b-2 border-black pb-2">Cohort: {cohortName}</h3>
      <p className="text-sm font-bold">Similarly-ready learners traversing the same sub-graph.</p>
      <div className="flex -space-x-4">
        {members.map((initials, idx) => (
          <div key={idx} className="w-12 h-12 rounded-full border-2 border-black bg-neo-yellow text-black font-black flex items-center justify-center z-10 shadow-brutal-active">
            {initials}
          </div>
        ))}
      </div>
    </div>
  );
}
