import React from 'react';
import { ExternalLink, Building, Clock, Calendar, Trophy, Globe, MapPin } from 'lucide-react';
import type { HackathonEvent } from '@aven/shared-types';

interface HackathonDetailPaneProps {
  event: HackathonEvent | null;
}

const PLATFORM_DOMAINS: Record<string, string> = {
  devfolio: 'devfolio.co',
  devpost: 'devpost.com',
  unstop: 'unstop.com',
  hack2skill: 'hack2skill.com',
  hackerearth: 'hackerearth.com',
  hackquest: 'hackquest.io',
  lablab: 'lablab.ai',
  mlh: 'mlh.io',
  whereuelevate: 'whereuelevate.com',
  hackculture: 'hackculture.com',
  dorahacks: 'dorahacks.io',
  ethglobal: 'ethglobal.com',
  taikai: 'taikai.network',
};

const CUSTOM_LOGOS: Record<string, string> = {
  'hackquest.io': '/platforms/hackquest.png',
  'hackculture.com': '/platforms/hackculture.png',
};

/**
 * Enterprise-grade implementation of FormattedDescription.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const FormattedDescription = ({ text }: { text: string }) => {
  if (!text) return null;

  // Pre-process text to add actual newlines before common structural markers
  let processed = text
    // 1. Specific Headings (e.g., "Prizes:", "How We Will Judge:")
    .replace(/(?:\.\s+|\b)(Prizes|How We Will Judge|Judging Criteria|Rules|Eligibility|Requirements|Timeline|Schedule|About|Meet [A-Za-z]+|Themes|Sponsors|FAQ):/gi, '\n\n$1:\n')
    // 2. Dynamic Headings (Questions or short phrases ending in colon)
    .replace(/([.!?])\s+([A-Z][^.!?]{3,65}?[\?:])(?=\s+[A-Z])/g, '$1\n\n$2\n')
    // 3. Dates (e.g., "September 23, 2026:")
    .replace(/(?:\.\s+|\b)((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}):/gi, '\n\n$1:\n')
    // 4. Bullet points for percentages (e.g., "35% Product and User Experience")
    .replace(/(?:\.\s+|\b)(\d{1,3}%)/g, '\n• $1')
    // 5. Bullet points for currency/prizes (e.g., "₹50,000 in cash")
    .replace(/(?:\.\s+|\b)(₹|\$|€)(\d+[,\d]*[kKmM]?)/g, '\n• $1$2')
    // 6. Generic bullet points (e.g., " - Collaborate" from Markdown)
    .replace(/\s+-\s+(?=[A-Za-z*])/g, '\n• ')
    // 7. Strip Markdown Bold/Italics for clean text since we aren't using a markdown parser
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // 8. Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n');

  // Split into blocks by double newline
  const blocks = processed.split('\n\n').map(b => b.trim()).filter(Boolean);
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const renderTextWithLinks = (text: string) => {
    if (!text.match(urlRegex)) return text;
    return text.split(urlRegex).map((part, k) => {
      if (part.match(urlRegex)) {
        return <a key={k} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{part}</a>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        
        return (
          <div key={i} className="space-y-1.5">
            {lines.map((line, j) => {
              // If line ends with colon/question mark, or is a known heading
              const isHeading = line.endsWith(':') || line.endsWith('?') || /^(Prizes|How We Will Judge|Judging Criteria|Rules|Eligibility|Requirements|Timeline|Schedule|About|Themes|Sponsors|FAQ)/i.test(line);
              const isBullet = line.startsWith('•');

              if (isHeading) {
                // Determine if it's a major section header (uppercase tracking-wide) or a sub-header/list title (bold)
                const isMajor = /^(Prizes|How We Will Judge|Judging Criteria|Rules|Eligibility|Requirements|Timeline|Schedule|About|Themes|Sponsors|FAQ)/i.test(line) || line.endsWith('?');
                
                return (
                  <strong key={j} className={`block text-[#141413] mt-3 mb-1 ${isMajor ? 'uppercase tracking-wide text-xs' : 'text-[13px]'}`}>
                    {line}
                  </strong>
                );
              }

              if (isBullet) {
                return (
                  <div key={j} className="flex items-start gap-2 text-sm text-[#3d3d3a] leading-relaxed">
                    <span className="text-[#87867f] mt-0.5">•</span>
                    <span>{renderTextWithLinks(line.substring(1).trim())}</span>
                  </div>
                );
              }

              return (
                <p key={j} className="text-sm text-[#3d3d3a] leading-relaxed font-medium">
                  {renderTextWithLinks(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Enterprise-grade implementation of HackathonDetailPane.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function HackathonDetailPane({ event }: HackathonDetailPaneProps) {
  if (!event) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-white border border-black/5 rounded-2xl">
        <div className="w-16 h-16 bg-[#f5f4ee] rounded-full flex items-center justify-center mb-4 border border-black/5">
          <MapPin size={24} className="text-[#87867f]" />
        </div>
        <h3 className="text-lg font-bold text-[#141413]">Select a Hackathon</h3>
        <p className="text-sm text-[#87867f] mt-1 max-w-[250px]">
          Click on any event in the master list to view its full details here.
        </p>
      </div>
    );
  }

  const domain = PLATFORM_DOMAINS[event.source?.toLowerCase()] || `${event.source}.com`;

  return (
    <div className="h-full flex flex-col bg-white border border-black/5 rounded-2xl shadow-sm relative overflow-hidden font-sans">
      
      {/* Massive Background Watermark Logo (Logo Dominance) */}
      <img
        src={CUSTOM_LOGOS[domain] || `https://icon.horse/icon/${domain}`}
        alt=""
        className="absolute -bottom-20 -right-20 w-96 h-96 opacity-[0.03] grayscale pointer-events-none z-0"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />

      {/* Header Area */}
      <div className="p-8 border-b border-black/5 relative z-10 flex items-start gap-5 bg-white/50 backdrop-blur-md">
        <div className="w-16 h-16 rounded-2xl bg-white border border-black/10 flex items-center justify-center shrink-0 shadow-sm">
          <img
            src={CUSTOM_LOGOS[domain] || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
            alt={`${event.source} logo`}
            className="w-8 h-8 object-contain"
            onError={(e) => {
              const fallbackUrl = `https://icon.horse/icon/${domain}`;
              if (e.currentTarget.src !== fallbackUrl) {
                e.currentTarget.src = fallbackUrl;
              } else {
                e.currentTarget.style.display = 'none';
              }
            }}
          />
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#141413] text-aven-text">
              {event.source}
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#141413] leading-tight">
            {event.title}
          </h2>
          {event.organizer && (
            <div className="text-sm font-semibold text-[#87867f] flex items-center gap-1.5 mt-1">
              <Building size={15} />
              <span>Hosted by {event.organizer}</span>
            </div>
          )}

          {/* Key Details Grid - Moved to Header for First Cognitive Sight */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
            <div className="bg-white/80 p-3 rounded-lg border border-black/5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#87867f]">Prize Purse</div>
              <div className="font-bold text-[#141413] mt-1 text-sm flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-500" />
                <span className="truncate">{event.prize_pool || 'Prizes TBD'}</span>
              </div>
            </div>
            <div className="bg-white/80 p-3 rounded-lg border border-black/5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#87867f]">Format</div>
              <div className="font-bold text-[#141413] mt-1 text-sm flex items-center gap-1.5 capitalize">
                {event.mode === 'online' ? <Globe size={14} /> : <MapPin size={14} />}
                <span className="truncate">{event.mode === 'online' ? 'Online sprint' : event.mode || 'In person'}</span>
              </div>
            </div>
            <div className="bg-white/80 p-3 rounded-lg border border-black/5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#87867f]">Location</div>
              <div className="font-bold text-[#141413] mt-1 text-sm flex items-center gap-1.5">
                <MapPin size={14} />
                <span className="truncate">{event.city || event.location || 'Remote'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 relative z-10">

        {/* Timeline */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#87867f]">Key Dates</h4>
          <div className="space-y-2 text-sm text-[#141413] font-medium">
            {event.registration_deadline && (
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-amber-600" />
                <span>Deadline: <strong>{new Date(event.registration_deadline.replace('Z', '+00:00')).toLocaleString()}</strong></span>
              </div>
            )}
            {event.event_start_date && (
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-emerald-600" />
                <span>Starts: <strong>{new Date(event.event_start_date.replace('Z', '+00:00')).toLocaleString()}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Overview */}
        {event.description && (
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#87867f]">About this hackathon</h4>
            <FormattedDescription text={event.description} />
          </div>
        )}

        {/* Tech & Skills */}
        {event.skills && event.skills.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#87867f]">Relevant Tech & Skills</h4>
            <div className="flex items-center gap-2 flex-wrap">
              {event.skills.map((sk, idx) => (
                <span key={idx} className="text-[11px] font-bold uppercase bg-black/5 text-[#141413] px-3 py-1.5 rounded-lg border border-black/5">
                  {sk}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Area */}
      <div className="p-6 border-t border-black/5 bg-white relative z-10 shrink-0">
        <a
          href={event.url || `https://${domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#141413] hover:bg-black/80 text-aven-text font-bold text-sm uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all hover:shadow-xl hover:-translate-y-0.5"
        >
          <span>{event.url ? `Apply on ${event.source}` : 'Visit Platform'}</span>
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
}
