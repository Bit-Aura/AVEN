'use client';

import React from 'react';
import { ExternalLink, MapPin, Globe, Building, Trophy, Heart, Sparkles, Users, Award, Code2 } from 'lucide-react';
import type { HackathonEvent } from '@aven/shared-types';

interface HackathonCardProps {
  event: HackathonEvent;
  onSelectDetails: (event: HackathonEvent) => void;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
}

const SOURCE_MONOGRAMS: Record<string, string> = {
  devfolio: 'DF',
  devpost: 'DP',
  unstop: 'US',
  hack2skill: 'H2S',
  hackerearth: 'HE',
  hackquest: 'HQ',
  lablab: 'LL',
  mlh: 'MLH',
  whereuelevate: 'WUE',
  hackculture: 'HC',
};

// Human-friendly deadline formatter
function formatHumanDeadline(deadlineIso?: string | null): { text: string; color: string; isUrgent: boolean } {
  if (!deadlineIso) return { text: 'Open for registration', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', isUrgent: false };
  try {
    const cleanStr = deadlineIso.replace('Z', '+00:00');
    const deadline = new Date(cleanStr);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs <= 0) return { text: 'Past deadline', color: 'bg-stone-100 text-stone-600 border-stone-200', isUrgent: false };

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days === 0) {
      return { text: `Closes in ${hours}h — don't miss it`, color: 'bg-amber-50 text-amber-900 border-amber-300 font-bold', isUrgent: true };
    }
    if (days === 1) {
      return { text: 'Closes tomorrow', color: 'bg-amber-50 text-amber-900 border-amber-300 font-bold', isUrgent: true };
    }
    if (days <= 7) {
      return { text: `${days} days left to apply`, color: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold', isUrgent: true };
    }

    const dayName = deadline.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { text: `Apply by ${dayName}`, color: 'bg-emerald-50 text-emerald-800 border-emerald-200', isUrgent: false };
  } catch {
    return { text: 'Open for registration', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', isUrgent: false };
  }
}

// Derive tags student care about from existing data
function deriveStudentTags(event: HackathonEvent): Array<{ label: string; icon: React.ComponentType<{ size: number }> }> {
  const tags: Array<{ label: string; icon: React.ComponentType<{ size: number }> }> = [];
  const text = `${event.title} ${event.description || ''} ${(event.skills || []).join(' ')}`.toLowerCase();

  if (['beginner', 'intro', 'starter', 'student', 'freshman', 'newbie', 'first'].some(k => text.includes(k))) {
    tags.push({ label: 'Beginner friendly', icon: Sparkles });
  }
  if (['team', 'group', 'squad', 'pair', 'duo'].some(k => text.includes(k))) {
    tags.push({ label: 'Team hack', icon: Users });
  }
  if (['ai', 'ml', 'python', 'pytorch', 'tensorflow', 'openai', 'llama', 'model'].some(k => text.includes(k))) {
    tags.push({ label: 'AI & LLMs', icon: Code2 });
  }
  if (event.prize_pool && (event.prize_pool.includes('$') || event.prize_pool.includes('₹') || event.prize_pool.toLowerCase().includes('lakh'))) {
    tags.push({ label: 'Cash prizes', icon: Award });
  }

  return tags.slice(0, 2);
}

export default function HackathonCard({
  event,
  onSelectDetails,
  isSaved = false,
  onToggleSave,
}: HackathonCardProps) {
  const deadlineInfo = formatHumanDeadline(event.registration_deadline);
  const monogram = SOURCE_MONOGRAMS[event.source] || event.source.slice(0, 3).toUpperCase();
  const studentTags = deriveStudentTags(event);

  const eventId = `${event.source}-${event.external_id}`;

  return (
    <div className="bg-white border border-[#141413]/10 hover:border-[#141413]/30 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md group relative font-sans">
      <div className="space-y-3">
        
        {/* Card Header: Platform Tag, Deadline & Bookmark Toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#f5f4ee] text-[#141413] border border-[#141413]/10">
              {monogram}
            </span>
            <span className="text-[11px] font-bold text-[#87867f] capitalize">
              {event.source}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${deadlineInfo.color}`}>
              {deadlineInfo.text}
            </span>

            {/* Bookmark / Heart Button */}
            {onToggleSave && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(eventId);
                }}
                className={`p-1.5 rounded-xl transition-all ${
                  isSaved
                    ? 'text-rose-600 bg-rose-50 border border-rose-200'
                    : 'text-[#87867f] hover:text-[#141413] hover:bg-[#f5f4ee]'
                }`}
                title={isSaved ? 'Remove from saved' : 'Save for later'}
                aria-label="Save hackathon"
              >
                <Heart size={14} className={isSaved ? 'fill-current' : ''} />
              </button>
            )}
          </div>
        </div>

        {/* Title & Host */}
        <div className="space-y-1">
          <h3
            onClick={() => onSelectDetails(event)}
            className="text-base font-black text-[#141413] group-hover:text-amber-600 transition-colors leading-snug line-clamp-2 cursor-pointer"
          >
            {event.title}
          </h3>
          {event.organizer && (
            <div className="text-xs font-semibold text-[#87867f] flex items-center gap-1.5">
              <Building size={12} className="shrink-0 text-[#87867f]" />
              <span className="line-clamp-1">Hosted by {event.organizer}</span>
            </div>
          )}
        </div>

        {/* Mode & Student Derived Tags */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#3d3d3a] flex-wrap">
          <span className="inline-flex items-center gap-1 bg-[#f5f4ee] px-2.5 py-1 rounded-lg text-[10px] uppercase font-black border border-[#141413]/5">
            {event.mode === 'online' ? <Globe size={11} /> : <MapPin size={11} />}
            <span>{event.mode === 'online' ? 'Online sprint' : event.mode || 'In person'}</span>
          </span>

          {studentTags.map((tag, tIdx) => {
            const TagIcon = tag.icon;
            return (
              <span
                key={tIdx}
                className="inline-flex items-center gap-1 bg-[#e8e6dc] text-[#141413] px-2.5 py-1 rounded-lg text-[10px] font-bold border border-[#141413]/10"
              >
                <TagIcon size={11} />
                <span>{tag.label}</span>
              </span>
            );
          })}
        </div>

        {/* Skills Tags */}
        {event.skills && event.skills.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {event.skills.slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                className="text-[9px] font-bold uppercase bg-[#f5f4ee] border border-[#141413]/10 text-[#3d3d3a] px-2 py-0.5 rounded-md"
              >
                {skill}
              </span>
            ))}
            {event.skills.length > 3 && (
              <span className="text-[9px] font-bold text-[#87867f]">
                +{event.skills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="pt-3 mt-4 border-t border-[#141413]/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 font-black text-xs text-[#141413]">
          <Trophy size={14} className="text-amber-500" />
          <span>{event.prize_pool || 'Prizes TBD'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectDetails(event)}
            className="text-[10px] font-black uppercase text-[#3d3d3a] hover:text-[#141413] bg-[#e8e6dc] hover:bg-[#d6d3c4] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            Quick View
          </button>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-black uppercase tracking-wider text-[#faf9f5] bg-[#141413] hover:bg-[#3d3d3a] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <span>Apply</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
