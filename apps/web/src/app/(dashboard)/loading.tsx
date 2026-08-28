import React from 'react';
import { BrainCircuit } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] bg-aven-base flex items-center justify-center -m-6 md:-m-8">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="relative">
          <div className="absolute inset-0 bg-aven-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="w-16 h-16 rounded-2xl bg-aven-primary border-2 border-aven-secondary flex items-center justify-center relative shadow-glow-blue z-10">
            <BrainCircuit size={32} className="text-aven-base" />
          </div>
        </div>
        
        <div className="space-y-3 flex flex-col items-center">
          <h2 className="text-xl font-black text-aven-text uppercase tracking-widest">
            Compiling Module
          </h2>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-aven-status-active animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-aven-status-active animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-aven-status-active animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
