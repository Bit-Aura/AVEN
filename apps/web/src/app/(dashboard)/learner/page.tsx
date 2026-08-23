'use client';

import { useState } from 'react';
import ReadinessBar from '../../../components/learner/ReadinessBar';
import CurrentNodeCard from '../../../components/learner/CurrentNodeCard';
import AutonomySliders from '../../../components/learner/AutonomySliders';
import CareerAlternativesDrawer from '../../../components/learner/CareerAlternativesDrawer';
import { RefreshCw } from 'lucide-react';

export default function LearnerDashboard() {
  const [readiness, setReadiness] = useState(42); // 42% readiness
  const [isPivotDrawerOpen, setIsPivotDrawerOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-neo-bg text-neo-text p-4 md:p-8">
      <header className="mb-8 border-b-8 border-black pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase">Your Dashboard</h1>
          <p className="text-xl font-bold mt-2">Target Role: Backend Engineer</p>
        </div>
        <ReadinessBar percentage={readiness} />
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <CurrentNodeCard 
            nodeName="Design RESTful APIs" 
            whyThisStep="You've mastered HTTP methods. API design is the immediate prerequisite for building your first Python FastAPI service." 
            whatIfSkip="Skipping this leaves you unprepared for 'Build a Backend Service'. The planner will require you to complete a double-length API project later."
          />
        </div>
        
        <aside className="flex flex-col gap-8">
          <div className="bg-neo-yellow border-4 border-black p-6 shadow-brutal">
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">Path Settings</h2>
            <AutonomySliders />
          </div>

          <div className="bg-white border-4 border-black p-6 shadow-brutal flex flex-col items-center text-center">
            <h3 className="text-xl font-black uppercase mb-2">Hitting a Wall?</h3>
            <p className="font-bold mb-4">You've built up solid foundational skills. You have options.</p>
            <button 
              onClick={() => setIsPivotDrawerOpen(true)}
              className="flex items-center gap-2 bg-neo-blue text-white border-4 border-black font-black uppercase px-6 py-3 shadow-brutal hover:shadow-brutal-active hover:translate-y-1 hover:translate-x-1 transition-transform w-full justify-center"
            >
              <RefreshCw size={20} />
              Explore Pivots
            </button>
          </div>
        </aside>
      </main>

      <CareerAlternativesDrawer 
        isOpen={isPivotDrawerOpen} 
        onClose={() => setIsPivotDrawerOpen(false)} 
      />
    </div>
  );
}
