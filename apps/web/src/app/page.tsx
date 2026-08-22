'use client';

import SkillGraph from '../components/SkillGraph';
import MilestoneCard from '../components/MilestoneCard';
import GoalChat from '../components/GoalChat';
import { usePathStore } from '../store/usePathStore';

export default function Home() {
  const userGoal = usePathStore((state) => state.userGoal);

  // If the user hasn't set a goal yet, show the GoalChat UI fullscreen.
  if (!userGoal) {
    return <GoalChat />;
  }

  const dummyMilestone = {
    id: '1',
    title: 'Python Basics',
    explanation: 'This is the most critical starting point for Backend Engineering. Python provides the fundamental syntax and concepts you will use for the rest of your path.',
    status: 'active' as const,
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col md:flex-row gap-8">
      <div className="flex-1 flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Your PathFinder Learning Graph</h1>
          <p className="text-slate-400 font-medium px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg inline-block">
            Goal: <span className="text-emerald-400">{userGoal}</span>
          </p>
        </div>
        <SkillGraph />
      </div>
      <div className="w-full md:w-96 flex flex-col gap-6 pt-[88px]">
        <h2 className="text-2xl font-bold mb-2">Active Milestone</h2>
        <MilestoneCard milestone={dummyMilestone} />
      </div>
    </main>
  );
}
