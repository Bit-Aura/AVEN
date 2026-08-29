import React from 'react';
import KanbanBoard from '@/components/simulator/KanbanBoard';
import StakeholderChat from '@/components/simulator/StakeholderChat';
import MockPullRequest from '@/components/simulator/MockPullRequest';

/**
 * Enterprise-grade implementation of DayOneSimulatorPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function DayOneSimulatorPage() {
  return (
    <div className="flex flex-col h-screen bg-slate-900 text-aven-text p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-sky-400">Day-One Simulator</h1>
        <p className="text-aven-text-subtle text-sm">Welcome to your simulated corporate workspace.</p>
      </header>
      
      <div className="flex flex-1 gap-6">
        <div className="w-1/3 flex flex-col gap-6">
          <div className="flex-1 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h2 className="text-lg font-semibold mb-4 text-aven-primary">Sprint Board</h2>
            <KanbanBoard />
          </div>
        </div>
        
        <div className="w-2/3 flex flex-col gap-6">
          <div className="h-1/2 bg-slate-800 rounded-lg p-4 border border-slate-700 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 text-emerald-300">Stakeholder Chat (AI PM)</h2>
            <StakeholderChat />
          </div>
          
          <div className="h-1/2 bg-slate-800 rounded-lg p-4 border border-slate-700 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 text-purple-300">Pull Request Review (AI Senior Dev)</h2>
            <MockPullRequest />
          </div>
        </div>
      </div>
    </div>
  );
}
