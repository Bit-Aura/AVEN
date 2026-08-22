'use client';

import React from 'react';
import SkillMap from '../components/SkillMap';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function Dashboard() {
  // Verify TanStack Query integration with health check endpoint
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      try {
        const { data } = await axios.get('/api/v1/health', {
          baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        });
        return data;
      } catch (err) {
        return { status: 'offline' };
      }
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            PathFinder Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : (healthData?.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500')}`} />
            <span className="text-sm text-slate-400">
              API Status: {isLoading ? 'Checking...' : (healthData?.status || 'Offline')}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 className="text-lg font-medium text-slate-400">Active Goals</h3>
            <p className="text-3xl font-bold mt-2">0</p>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 className="text-lg font-medium text-slate-400">Total Milestones</h3>
            <p className="text-3xl font-bold mt-2">0</p>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 className="text-lg font-medium text-slate-400">Next Step</h3>
            <p className="text-sm text-slate-500 italic mt-2">Diagnostic required to generate path.</p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Skill Graph Prerequisite Map</h2>
              <p className="text-sm text-slate-400">Interactive path structure visualized using React Flow</p>
            </div>
          </div>
          
          <SkillMap />
        </section>
      </main>
    </div>
  );
}
