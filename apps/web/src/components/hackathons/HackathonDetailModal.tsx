'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Building, Clock, Calendar, Trophy, Globe, MapPin } from 'lucide-react';
import type { HackathonEvent } from '@aven/shared-types';

interface HackathonDetailModalProps {
  event: HackathonEvent | null;
  onClose: () => void;
}

/**
 * Enterprise-grade implementation of HackathonDetailModal.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function HackathonDetailModal({ event, onClose }: HackathonDetailModalProps) {
  if (!event) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-[#141413]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white border border-[#141413]/20 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[#141413] font-sans"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-5 top-5 text-[#87867f] hover:text-[#141413] p-1.5 rounded-xl hover:bg-[#f5f4ee] transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="space-y-2 pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-[#141413] text-[#faf9f5]">
                {event.source}
              </span>
              <span className="text-xs font-bold text-[#87867f]">
                {event.external_id}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-[#141413] leading-snug">
              {event.title}
            </h2>
            {event.organizer && (
              <div className="text-xs font-bold text-[#87867f] flex items-center gap-1.5">
                <Building size={14} className="text-[#87867f]" />
                <span>Hosted by {event.organizer}</span>
              </div>
            )}
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-[#f5f4ee] rounded-2xl text-xs border border-[#141413]/5">
            <div>
              <div className="text-[10px] font-black uppercase text-[#87867f]">Prize Purse</div>
              <div className="font-black text-[#141413] mt-0.5 text-sm flex items-center gap-1">
                <Trophy size={14} className="text-amber-500" />
                <span>{event.prize_pool || 'Prizes TBD'}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-[#87867f]">Format</div>
              <div className="font-black text-[#141413] capitalize mt-0.5 flex items-center gap-1">
                {event.mode === 'online' ? <Globe size={13} /> : <MapPin size={13} />}
                <span>{event.mode === 'online' ? 'Online sprint' : event.mode || 'In person'}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-[#87867f]">Location</div>
              <div className="font-bold text-[#141413] mt-0.5">{event.city || event.location || 'Everywhere (Remote)'}</div>
            </div>
          </div>

          {/* Overview */}
          {event.description && (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#141413]">About this hackathon</h4>
              <p className="text-xs text-[#3d3d3a] leading-relaxed whitespace-pre-wrap font-medium bg-[#f5f4ee] p-4 rounded-2xl border border-[#141413]/5">
                {event.description}
              </p>
            </div>
          )}

          {/* Tech & Skills */}
          {event.skills && event.skills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#141413]">Relevant Tech & Skills</h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {event.skills.map((sk, idx) => (
                  <span key={idx} className="text-xs font-bold uppercase bg-[#f5f4ee] text-[#141413] px-2.5 py-1 rounded-lg border border-[#141413]/10">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#141413]">Key Dates</h4>
            <div className="space-y-2 text-xs text-[#3d3d3a] bg-[#f5f4ee] p-4 rounded-2xl border border-[#141413]/5">
              {event.registration_deadline && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-600" />
                  <span>Application Deadline: <strong>{new Date(event.registration_deadline.replace('Z', '+00:00')).toLocaleString()}</strong></span>
                </div>
              )}
              {event.event_start_date && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-emerald-600" />
                  <span>Hackathon Begins: <strong>{new Date(event.event_start_date.replace('Z', '+00:00')).toLocaleString()}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#141413]/10 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-xs font-bold uppercase text-[#87867f] hover:text-[#141413]"
            >
              Close
            </button>
            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#141413] hover:bg-[#3d3d3a] text-[#faf9f5] font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
              >
                <span>Go to Official Application</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
