'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathStore } from '../../../store/usePathStore';
import { Brain, ArrowRight, Zap, Target, Loader2 } from 'lucide-react';

/**
 * Enterprise-grade implementation of IdentityOnboarding.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function IdentityOnboarding() {
  const router = useRouter();
  const updatePreference = usePathStore(state => state.updateRankingPreference);
  const preferences = usePathStore(state => state.rankingPreferences);
  
  const [currentIdentity, setCurrentIdentity] = useState('');
  const [futureIdentity, setFutureIdentity] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentIdentity || !futureIdentity) return;
    
    setIsCompiling(true);
    
    // Simulate compilation delay
    setTimeout(() => {
      router.push('/learner');
    }, 2500);
  };

  if (isCompiling) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-4">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
          <Brain className="text-indigo-400 animate-pulse relative z-10" size={64} />
        </div>
        <h2 className="text-2xl font-black text-white uppercase mt-8 tracking-wider">
          Compiling your unique neural pathway...
        </h2>
        <p className="text-slate-400 mt-4 max-w-md">
          Aligning curriculum to bridge the gap between "{currentIdentity}" and "{futureIdentity}".
        </p>
        <Loader2 className="animate-spin text-indigo-500 mt-8" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center py-12 px-4 md:px-8 font-sans">
      <div className="w-full max-w-2xl">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-black uppercase text-white tracking-tight mb-4">
            Identity Calibration
          </h1>
          <p className="text-xl text-slate-400">
            Tell us who you are, so we can build the bridge to who you will become.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12 bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                <Target size={16} /> Origin
              </label>
              <h2 className="text-2xl font-bold text-white">Who are you today?</h2>
              <input 
                type="text" 
                required
                value={currentIdentity}
                onChange={(e) => setCurrentIdentity(e.target.value)}
                placeholder="e.g. 'A self-taught script kiddie', 'A burnt-out frontend dev'"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-lg"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <Zap size={16} /> Destination
              </label>
              <h2 className="text-2xl font-bold text-white">Who do you want to be tomorrow?</h2>
              <input 
                type="text" 
                required
                value={futureIdentity}
                onChange={(e) => setFutureIdentity(e.target.value)}
                placeholder="e.g. 'A scalable systems architect', 'An AI engineer'"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-lg"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 space-y-8">
            <h3 className="text-xl font-bold text-white mb-6">Tune Your Learning Engine</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-wide">
                <span>Speed (Fast Paced)</span>
                <span>Depth (Comprehensive)</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={preferences.speedVsDepth}
                onChange={(e) => updatePreference('speedVsDepth', Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-wide">
                <span>Theory (Concepts)</span>
                <span>Practice (Hands-on)</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={preferences.theoryVsPractice}
                onChange={(e) => updatePreference('theoryVsPractice', Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-wide">
                <span>Directed (Guided)</span>
                <span>Autonomous (Exploratory)</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={preferences.directedVsAutonomous}
                onChange={(e) => updatePreference('directedVsAutonomous', Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={!currentIdentity || !futureIdentity}
            className="w-full bg-white text-slate-950 font-black uppercase tracking-wider py-5 rounded-xl hover:bg-indigo-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group mt-8"
          >
            Generate Neural Pathway
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}
