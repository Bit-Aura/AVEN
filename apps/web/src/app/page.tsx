import SkillGraph from '../components/SkillGraph';
import MilestoneCard from '../components/MilestoneCard';

export default function Home() {
  const dummyMilestone = {
    id: '1',
    title: 'Python Basics',
    explanation: 'This is the most critical starting point for Backend Engineering. Python provides the fundamental syntax and concepts you will use for the rest of your path.',
    status: 'active' as const,
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col md:flex-row gap-8">
      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold mb-6">Your PathFinder Learning Graph</h1>
        <SkillGraph />
      </div>
      <div className="w-full md:w-96 flex flex-col gap-6">
        <h2 className="text-2xl font-bold mb-2">Active Milestone</h2>
        <MilestoneCard milestone={dummyMilestone} />
      </div>
    </main>
  );
}
