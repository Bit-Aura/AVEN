'use client';

import React from 'react';
import { ExternalLink, Trophy, Calendar, MapPin, Users, Target, Rocket } from 'lucide-react';
import type { HackathonEvent } from '@aven/shared-types';

interface HackathonStageProps {
  event: HackathonEvent | null;
}

const PLATFORM_DOMAINS: Record<string, string> = {
  devpost: 'devpost.com',
  devfolio: 'devfolio.co',
  unstop: 'unstop.com',
  dorahacks: 'dorahacks.io',
  taikai: 'taikai.network',
  ethglobal: 'ethglobal.com',
};

const formatDeadline = (dateString?: string) => {
  if (!dateString) return 'TBA';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function HackathonStage({ event }: HackathonStageProps) {
  if (!event) {
    return (
      <div className="w-full h-full bg-[#f5f4ee]/50 rounded-3xl border border-black/5 flex items-center justify-center">
        <div className="text-center space-y-4 opacity-40 grayscale">
          <Target size={48} className="mx-auto" />
          <h2 className="text-xl font-bold text-[#141413]">Select an event</h2>
          <p className="text-sm font-medium">Hover or click an event in the stream to view details.</p>
        </div>
      </div>
    );
  }

  const domain = PLATFORM_DOMAINS[event.source?.toLowerCase()] || `${event.source}.com`;

  return (
    <div className="w-full h-full bg-white rounded-3xl border border-black/5 shadow-2xl shadow-black/[0.02] flex flex-col relative overflow-hidden group/stage">
      
      {/* Massive Dominant Background Logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-[0.02] grayscale pointer-events-none flex items-center justify-center z-0 transition-all duration-1000 group-hover/stage:scale-105 group-hover/stage:rotate-3 group-hover/stage:opacity-[0.04]">
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt=""
          className="w-full h-full object-contain blur-sm"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>

      <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none z-0">
         <img
          src={`https://logo.clearbit.com/${domain}`}
          alt=""
          className="w-48 h-48 object-contain"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>

      <div className="relative z-10 p-10 flex-1 overflow-y-auto hide-scrollbar flex flex-col">
        
        {/* Header: Platform & Logo */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white border border-black/5 shadow-sm flex items-center justify-center shrink-0">
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
              alt={`${event.source} logo`}
              className="w-8 h-8 object-contain"
              onError={(e) => { e.currentTarget.src = `https://logo.clearbit.com/${domain}`; }}
            />
          </div>
          <span className="text-lg font-black text-[#141413] tracking-tight uppercase">
            {event.source}
          </span>
        </div>

        {/* Massive Title */}
        <h1 className="text-4xl lg:text-5xl font-black text-[#141413] leading-[1.1] tracking-tight mb-8">
          {event.title}
        </h1>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-[#f5f4ee] p-4 rounded-2xl flex flex-col gap-1 border border-black/5">
            <span className="text-xs font-bold text-[#87867f] uppercase tracking-wider">Prize Pool</span>
            <div className="flex items-center gap-2 text-[#141413]">
              <Trophy size={16} className="text-amber-500" />
              <span className="font-black text-lg">{event.prize_pool || 'TBD'}</span>
            </div>
          </div>
          <div className="bg-[#f5f4ee] p-4 rounded-2xl flex flex-col gap-1 border border-black/5">
            <span className="text-xs font-bold text-[#87867f] uppercase tracking-wider">Deadline</span>
            <div className="flex items-center gap-2 text-[#141413]">
              <Calendar size={16} className="text-rose-500" />
              <span className="font-bold text-lg">{formatDeadline(event.registration_deadline)}</span>
            </div>
          </div>
          <div className="bg-[#f5f4ee] p-4 rounded-2xl flex flex-col gap-1 border border-black/5">
            <span className="text-xs font-bold text-[#87867f] uppercase tracking-wider">Location / Format</span>
            <div className="flex items-center gap-2 text-[#141413]">
              <MapPin size={16} className="text-emerald-500" />
              <span className="font-bold text-lg capitalize">{event.mode || 'Online'}</span>
            </div>
          </div>
          <div className="bg-[#f5f4ee] p-4 rounded-2xl flex flex-col gap-1 border border-black/5">
            <span className="text-xs font-bold text-[#87867f] uppercase tracking-wider">Participants</span>
            <div className="flex items-center gap-2 text-[#141413]">
              <Users size={16} className="text-blue-500" />
              <span className="font-bold text-lg">{event.participants_count || 'Be the first!'}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-4 mb-12">
          <h3 className="text-sm font-black text-[#87867f] uppercase tracking-wider">About the Hackathon</h3>
          <p className="text-[#3d3d3a] font-medium leading-relaxed text-base max-w-2xl">
            {event.description || 'Join this exciting hackathon to build innovative projects, network with top developers, and compete for amazing prizes!'}
          </p>
        </div>
        
        {/* Themes / Tags */}
        {(event.themes && event.themes.length > 0) && (
           <div className="space-y-4 mb-10">
            <h3 className="text-sm font-black text-[#87867f] uppercase tracking-wider">Themes</h3>
            <div className="flex flex-wrap gap-2">
              {event.themes.map((theme, i) => (
                <span key={i} className="px-4 py-2 bg-white border border-black/10 rounded-xl text-sm font-bold text-[#141413]">
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Sticky Action Footer inside Stage */}
        <div className="sticky bottom-0 pt-6 mt-6 border-t border-black/5 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[#87867f]">
             <Rocket size={18} className="text-indigo-500" />
             Ready to build?
          </div>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-[#141413] hover:bg-black/80 text-aven-text rounded-2xl font-black text-lg flex items-center gap-3 transition-all hover:-translate-y-1 hover:shadow-xl shadow-black/20"
            >
              Apply Now
              <ExternalLink size={20} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
