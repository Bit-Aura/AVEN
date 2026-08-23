'use client';

import { useState } from 'react';
import ReadinessBar from '../../../components/learner/ReadinessBar';
import CurrentNodeCard from '../../../components/learner/CurrentNodeCard';
import AutonomySliders from '../../../components/learner/AutonomySliders';

export default function LearnerDashboard() {
  const [readiness, setReadiness] = useState(42); // 42% readiness
  
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
        </aside>
      </main>
    </div>
  );
}
