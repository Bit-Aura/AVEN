'use client';

import { useState } from 'react';

export default function CurrentNodeCard({ nodeName, whyThisStep, whatIfSkip }: { nodeName: string, whyThisStep: string, whatIfSkip: string }) {
  const [showWhy, setShowWhy] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  return (
    <div className="bg-white border-8 border-black shadow-brutal p-8 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b-4 border-black pb-4">
        <h2 className="text-3xl font-black uppercase">Current Step: {nodeName}</h2>
        <button className="bg-neo-blue text-white border-4 border-black font-black uppercase px-6 py-2 shadow-brutal hover:shadow-brutal-active hover:translate-y-1 hover:translate-x-1">
          Start Lesson
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <button 
            onClick={() => setShowWhy(!showWhy)}
            className="flex items-center gap-2 text-xl font-bold hover:underline"
          >
            <span className="text-2xl">{showWhy ? '▾' : '▸'}</span> Why This Step?
          </button>
          {showWhy && (
            <div className="mt-2 bg-neo-yellow border-4 border-black p-4 text-lg font-bold shadow-brutal">
              {whyThisStep}
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={() => setShowSkip(!showSkip)}
            className="flex items-center gap-2 text-xl font-bold hover:underline"
          >
            <span className="text-2xl">{showSkip ? '▾' : '▸'}</span> What If I Skip This?
          </button>
          {showSkip && (
            <div className="mt-2 bg-neo-red text-white border-4 border-black p-4 text-lg font-bold shadow-brutal">
              {whatIfSkip}
              <button className="block mt-4 bg-black text-white px-4 py-2 uppercase font-black border-2 border-white hover:bg-gray-800">
                Reject this recommendation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
