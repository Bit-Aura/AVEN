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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-2 md:p-6">
      <div
        className={`bg-surface border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none'
            : 'w-full max-w-6xl h-[85vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-border bg-surface-secondary/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
              <Video size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {sessionTitle}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Meeting
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  <User size={11} className="text-slate-400" />
                  {userName} ({userRole})
                </span>
                <span>•</span>
                <span className="text-slate-500 font-mono text-[10px]">
                  Room: {roomName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Session Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-mono text-slate-300">
              <Clock size={13} className="text-indigo-400" />
              <span>{formatTimer(elapsedSeconds)}</span>
              <span className="text-slate-500 text-[10px]">/ {durationMinutes}m</span>
            </div>

            {/* Notes Toggle */}
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`p-2 rounded-xl border transition-colors ${
                showNotes
                  ? 'bg-brand-600 text-white border-brand-500 shadow-glow-indigo'
                  : 'bg-surface text-slate-300 border-border hover:bg-surface-secondary'
              }`}
              title="Toggle Live Session Scratchpad"
            >
              <FileText size={16} />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-surface border border-border text-slate-300 hover:text-white hover:bg-surface-secondary transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close / Leave */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-colors"
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
            <div className="w-80 border-l border-border bg-surface-secondary/90 flex flex-col p-4 space-y-3 animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                  <FileText size={13} className="text-indigo-400" />
                  <span>Session Scratchpad</span>
                </div>
                <span className="text-[10px] text-slate-500">Live notes</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Take live notes during the discussion, code snippets, or architectural points..."
                className="flex-1 bg-surface border border-border rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none font-mono"
              />
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>Notes remain on your screen during the call</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
