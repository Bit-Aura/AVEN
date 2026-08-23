import { useState } from 'react';

export default function OpportunityAlert({ skill, spikePercent }: { skill: string, spikePercent: number }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed bottom-8 right-8 bg-neo-yellow border-8 border-black shadow-brutal p-6 max-w-sm z-50 animate-bounce">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-black uppercase tracking-tight">⚡ Opportunity Shock!</h3>
        <button onClick={() => setVisible(false)} className="text-xl font-bold hover:text-neo-red">&times;</button>
      </div>
      <p className="font-bold text-lg">
        Demand for <span className="bg-white px-1 border-2 border-black">{skill}</span> just spiked by <span className="text-neo-red font-black">{spikePercent}%</span> in active job postings.
      </p>
      <button className="w-full mt-4 bg-black text-white px-4 py-3 uppercase font-black border-2 border-white hover:bg-gray-800 transition-all">
        Prioritize this skill
      </button>
    </div>
  );
}
