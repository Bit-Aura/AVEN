'use client';

import { useState } from 'react';

export default function AutonomySliders() {
  const [speed, setSpeed] = useState(50);
  const [cost, setCost] = useState(50);
  const [modality, setModality] = useState(50);

  const handleReRoute = () => {
    // Stub for live re-route logic
    console.log("Re-routing based on:", { speed, cost, modality });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="flex justify-between font-bold uppercase mb-2">
          <span>Fast / Shallow</span>
          <span>Slow / Deep</span>
        </label>
        <input 
          type="range" 
          min="0" max="100" 
          value={speed} 
          onChange={(e) => setSpeed(Number(e.target.value))}
          onMouseUp={handleReRoute}
          className="w-full accent-black h-2 bg-white border-2 border-black appearance-none" 
        />
      </div>

      <div>
        <label className="flex justify-between font-bold uppercase mb-2">
          <span>Free Tools</span>
          <span>Paid Tools</span>
        </label>
        <input 
          type="range" 
          min="0" max="100" 
          value={cost} 
          onChange={(e) => setCost(Number(e.target.value))}
          onMouseUp={handleReRoute}
          className="w-full accent-black h-2 bg-white border-2 border-black appearance-none" 
        />
      </div>

      <div>
        <label className="flex justify-between font-bold uppercase mb-2">
          <span>Video Heavy</span>
          <span>Project Heavy</span>
        </label>
        <input 
          type="range" 
          min="0" max="100" 
          value={modality} 
          onChange={(e) => setModality(Number(e.target.value))}
          onMouseUp={handleReRoute}
          className="w-full accent-black h-2 bg-white border-2 border-black appearance-none" 
        />
      </div>
      
      <p className="text-sm font-bold bg-white p-2 border-2 border-black">
        Note: Moving these sliders triggers a live re-route in the PathPlanner.
      </p>
    </div>
  );
}
