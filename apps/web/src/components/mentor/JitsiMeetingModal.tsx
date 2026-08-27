'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Video,
  Clock,
  FileText,
  User,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface JitsiMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  sessionTitle: string;
  userName: string;
  userRole: 'learner' | 'mentor';
  durationMinutes?: number;
}

export default function JitsiMeetingModal({
  isOpen,
  onClose,
  roomName,
  sessionTitle,
  userName,
  userRole,
  durationMinutes = 30,
}: JitsiMeetingModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !roomName) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayNameParam = encodeURIComponent(`${userName} (${userRole === 'mentor' ? 'Mentor' : 'Learner'})`);
  // Jitsi configuration flags for clean embed
  const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(roomName)}#userInfo.displayName="${displayNameParam}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&interfaceConfig.TOOLBAR_BUTTONS=['microphone','camera','closedcaptions','desktop','embedmeeting','fullscreen','fodeviceselection','hangup','profile','chat','recording','livestreaming','etherpad','sharedvideo','settings','raisehand','videoquality','filmstrip','feedback','stats','shortcuts','tileview','videobackgroundblur','download','help','mute-everyone','e2ee']`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/70 backdrop-blur-sm animate-in fade-in duration-200 p-2 md:p-6">
      <div
        className={`bg-[#faf9f5] border border-[#d6d3c4] rounded-xl flex flex-col shadow-lg overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none'
            : 'w-full max-w-6xl h-[85vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-[#d6d3c4] bg-[#e8e6dc] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded bg-[#faf9f5] border border-[#d6d3c4] text-[#141413]">
              <Video size={16} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-black text-[#141413] tracking-widest uppercase">
                  {sessionTitle}
                </h3>
                <span className="px-2 py-0.5 rounded bg-[#141413] text-[#faf9f5] text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-[#141413]">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="text-[10px] font-bold text-[#3d3d3a] uppercase tracking-widest flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1">
                  <User size={12} className="text-[#3d3d3a]" />
                  {userName} ({userRole})
                </span>
                <span>•</span>
                <span>
                  Room: {roomName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Session Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#faf9f5] border border-[#d6d3c4] text-[11px] font-black text-[#141413] tracking-wider uppercase">
              <Clock size={13} className="text-[#141413]" />
              <span>{formatTimer(elapsedSeconds)}</span>
              <span className="text-[#a3a198]">/ {durationMinutes}m</span>
            </div>

            {/* Notes Toggle */}
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`p-2 rounded border transition-colors ${
                showNotes
                  ? 'bg-[#141413] text-[#faf9f5] border-[#141413]'
                  : 'bg-[#faf9f5] text-[#3d3d3a] border-[#d6d3c4] hover:border-[#141413] hover:text-[#141413]'
              }`}
              title="Toggle Live Session Scratchpad"
            >
              <FileText size={16} />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded bg-[#faf9f5] border border-[#d6d3c4] text-[#3d3d3a] hover:border-[#141413] hover:text-[#141413] transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close / Leave */}
            <button
              onClick={onClose}
              className="p-2 rounded bg-[#faf9f5] border border-[#d6d3c4] text-[#141413] hover:border-red-500 hover:text-red-500 transition-colors"
              title="Leave Meeting & Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Meeting Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Jitsi Iframe Video Feed */}
          <div className="flex-1 h-full bg-black relative">
            <iframe
              src={jitsiUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
              className="w-full h-full border-none"
              title="Mentor Connect Meeting"
            />
          </div>

          {/* Side Scratchpad Notes (Optional) */}
          {showNotes && (
            <div className="w-80 border-l border-[#d6d3c4] bg-[#e8e6dc] flex flex-col p-5 space-y-4 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#d6d3c4]">
                <div className="flex items-center gap-2 text-[11px] font-black text-[#141413] uppercase tracking-widest">
                  <FileText size={14} className="text-[#141413]" />
                  <span>Session Scratchpad</span>
                </div>
                <span className="text-[9px] font-bold text-[#3d3d3a] uppercase tracking-widest">Live notes</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Take live notes during the discussion, code snippets, or architectural points..."
                className="flex-1 bg-[#faf9f5] border border-[#d6d3c4] rounded p-4 text-xs text-[#141413] placeholder-[#a3a198] focus:outline-none focus:border-[#141413] focus:ring-0 resize-none font-mono"
              />
              <div className="text-[9px] font-bold text-[#3d3d3a] uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-[#141413]" />
                <span>Notes remain on your screen during the call</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
