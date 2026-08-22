'use client';

import { usePathStore } from '../store/usePathStore';
import { useEffect, useState } from 'react';

export default function MicroCelebration() {
  const showCelebration = usePathStore((state) => state.showCelebration);
  const hideCelebration = usePathStore((state) => state.hideCelebration);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (showCelebration) {
      setIsVisible(true);
      
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(hideCelebration, 500); // wait for fade out
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showCelebration, hideCelebration]);

  if (!showCelebration && !isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Background Burst Overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-indigo-500/20 to-transparent animate-pulse" />
      
      {/* Main Text Content */}
      <div className="relative flex flex-col items-center">
        <div className="animate-bounce">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 drop-shadow-[0_0_30px_rgba(250,204,21,0.6)] tracking-tight text-center">
            LEVEL UP!
          </h1>
        </div>
        <div className="mt-4 animate-in slide-in-from-bottom fade-in duration-700 delay-150">
          <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg bg-black/30 px-6 py-2 rounded-full border border-white/10 backdrop-blur-sm">
            Milestone Completed 🎉
          </p>
        </div>
      </div>
    </div>
  );
}
