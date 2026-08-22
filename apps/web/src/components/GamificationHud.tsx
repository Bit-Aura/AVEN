'use client';

import { usePathStore } from '../store/usePathStore';
import { Flame, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function GamificationHud() {
  const streak = usePathStore((state) => state.streak);
  const xp = usePathStore((state) => state.xp);

  const [xpAnimate, setXpAnimate] = useState(false);
  
  // Track previous XP to detect increases and trigger animation
  const [prevXp, setPrevXp] = useState(xp);

  useEffect(() => {
    if (xp > prevXp) {
      setXpAnimate(true);
      const timer = setTimeout(() => setXpAnimate(false), 500); // Remove animation class after 500ms
      setPrevXp(xp);
      return () => clearTimeout(timer);
    }
  }, [xp, prevXp]);

  return (
    <div className="absolute top-6 left-6 z-40 flex items-center gap-3">
      {/* Streak Badge */}
      <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-orange-500/30 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.15)]">
        <Flame size={18} className="text-orange-500 fill-orange-500" />
        <span className="text-orange-50 font-bold text-sm">{streak} Days</span>
      </div>

      {/* XP Badge */}
      <div 
        className={`flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-amber-400/30 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.15)] transition-transform duration-300 ${
          xpAnimate ? 'scale-110 ring-2 ring-amber-400/50 bg-amber-900/50' : 'scale-100'
        }`}
      >
        <Star size={18} className="text-amber-400 fill-amber-400" />
        <span className="text-amber-50 font-bold text-sm">
          {xp.toLocaleString()} XP
        </span>
      </div>
    </div>
  );
}
