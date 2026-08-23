'use client';

import { useState, useEffect } from 'react';
import { usePathStore } from '../../store/usePathStore';
import { simulateSkipDelta } from '../../api/client';

export default function CurrentNodeCard({ nodeName, whyThisStep, whatIfSkip }: { nodeName: string, whyThisStep: string, whatIfSkip: string }) {
  const [showWhy, setShowWhy] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  
  const isSimulatingSkip = usePathStore((state) => state.isSimulatingSkip);
  const simulateSkip = usePathStore((state) => state.simulateSkip);
  const cancelSimulation = usePathStore((state) => state.cancelSimulation);
  const activeMilestone = usePathStore((state) => state.activeMilestone);

  const [weeklyHours, setWeeklyHours] = useState(10);
  const [projectedDate, setProjectedDate] = useState('Oct 14');
  const [deltaText, setDeltaText] = useState('');

  useEffect(() => {
    if (!isSimulatingSkip) return;

    const timer = setTimeout(async () => {
      try {
        const safeProfileId = usePathStore.getState().profileId || 1;
        const nodeId = activeMilestone?.id || 'current';
        const data = await simulateSkipDelta(safeProfileId, nodeId, weeklyHours);
        setProjectedDate(data.projectedDate || data.delta_days_calendar || 'Nov 04');
        setDeltaText(data.deltaText || `(+${data.delta_days || 0} days)`);
      } catch (e) {
        // Fallback for UI if API is missing
        const daysAdded = Math.max(0, 21 - Math.floor(weeklyHours * 0.5));
        setProjectedDate('Nov 04');
        setDeltaText(`(+${daysAdded} days)`);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [weeklyHours, isSimulatingSkip]);

  const handleSimulateSkipToggle = () => {
    if (isSimulatingSkip) {
      cancelSimulation();
    } else {
      // Use milestone ID if available, otherwise fallback
      simulateSkip(activeMilestone?.id || 'current', weeklyHours);
      setShowSkip(true);
    }
  };

  return (
    <div className="bg-white border-8 border-black shadow-brutal p-8 flex flex-col gap-6 transition-all duration-300 relative">
      {isSimulatingSkip && (
        <div className="absolute inset-0 bg-neo-red/10 border-4 border-neo-red pointer-events-none animate-pulse z-10" />
      )}
      <div className="flex justify-between items-center border-b-4 border-black pb-4 relative z-20">
        <h2 className="text-3xl font-black uppercase">Current Step: {activeMilestone?.title || nodeName}</h2>
        <button className="bg-neo-blue text-white border-4 border-black font-black uppercase px-6 py-2 shadow-brutal hover:shadow-brutal-active hover:translate-y-1 hover:translate-x-1 transition-transform">
          Start Lesson
        </button>
      </div>

      <div className="flex flex-col gap-4 relative z-20">
        <div>
          <button 
            onClick={() => setShowWhy(!showWhy)}
            className="flex items-center gap-2 text-xl font-bold hover:underline"
          >
            <span className="text-2xl">{showWhy ? '▾' : '▸'}</span> Why This Step?
          </button>
          {showWhy && (
            <div className="mt-2 bg-neo-yellow border-4 border-black p-4 text-lg font-bold shadow-brutal">
              {activeMilestone?.explanation || whyThisStep}
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={handleSimulateSkipToggle}
            className="flex items-center gap-2 text-xl font-bold hover:underline"
          >
            <span className="text-2xl">{isSimulatingSkip ? '▾' : '▸'}</span> {isSimulatingSkip ? 'Cancel Simulation' : 'What If I Skip This?'}
          </button>
          {isSimulatingSkip && (
            <div className="mt-2 bg-neo-red text-white border-4 border-black p-4 text-lg font-bold shadow-brutal space-y-4">
              <p>{whatIfSkip}</p>
              
              <div className="bg-white text-black p-4 border-4 border-black mt-4">
                <h3 className="font-black uppercase mb-2">Date-Delta Simulator</h3>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="font-bold text-sm">Projected Readiness</div>
                    <div className="text-2xl font-black">
                      Oct 14 ──► {projectedDate} <span className="text-neo-red">{deltaText}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between font-bold">
                    <span>Study Budget</span>
                    <span>{weeklyHours} hrs/week</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="40" 
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(Number(e.target.value))}
                    className="w-full accent-neo-blue"
                  />
                </div>
              </div>

              <button 
                onClick={cancelSimulation}
                className="block mt-4 bg-black text-white px-4 py-2 uppercase font-black border-2 border-white hover:bg-gray-800 transition-colors"
              >
                Reject this recommendation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
