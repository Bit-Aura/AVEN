'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { getP2PSession } from '@/api/client';
import { Editor } from '@monaco-editor/react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useYjs } from '@/hooks/useYjs';
import { Clock, Users, ArrowRight, ShieldAlert, CheckCircle, Video, Mic, MicOff, VideoOff, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function P2PInterviewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;
  const { user } = useUser();

  const [session, setSession] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 mins per half
  
  // WebRTC hooks
  const { localStream, remoteStream, isConnected } = useWebRTC(sessionId, user?.id);
  
  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Yjs binding with Cursor Awareness
  const editorRef = useRef<any>(null);
  const myName = user?.fullName || user?.firstName || 'Learner';
  // Give distinct colors based on role
  const myColor = user?.id === session?.user1_id ? '#3b82f6' : '#10b981'; 
  const { synced } = useYjs(sessionId, editorRef, myName, myColor);

  // UI toggles
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Fetch session details
    const loadSession = async () => {
      try {
        const res = await getP2PSession(sessionId);
        setSession(res);
      } catch (err) {
        console.error("Failed to load session:", err);
      }
    };
    if (sessionId) loadSession();
    
    // Auto trigger fullscreen for immersive experience
    const t = setTimeout(() => setIsFullscreen(true), 600);
    return () => clearTimeout(t);
  }, [sessionId]);

  // Attach video streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Media toggles
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMicMuted;
      });
    }
  }, [localStream, isMicMuted]);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOff;
      });
    }
  }, [localStream, isVideoOff]);

  // Timer logic synchronized with backend
  useEffect(() => {
    if (!session?.id) return; // Wait until session is loaded
    
    let initialElapsed = 0;
    if (session.created_at) {
      try {
        let dateStr = session.created_at;
        if (dateStr.includes(' ') && !dateStr.includes('T')) {
          dateStr = dateStr.replace(' ', 'T');
        }
        const startedAt = new Date(dateStr).getTime();
        
        if (!isNaN(startedAt)) {
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          if (elapsed >= -60 && elapsed < 30 * 60) {
            initialElapsed = Math.max(elapsed, 0);
          }
        }
      } catch (e) {
        // Fallback if parsing completely fails
      }
    }

    let currentRemaining = Math.max(30 * 60 - initialElapsed, 0);
    setTimeLeft(currentRemaining);

    // Update every second using a reliable decrement so it never freezes
    const timer = setInterval(() => {
      currentRemaining = Math.max(currentRemaining - 1, 0);
      setTimeLeft(currentRemaining);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [session?.id, session?.created_at]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const isUser1 = user?.id === session?.user1_id;
  // Part 1: User 1 is interviewer. Part 2: User 2 is interviewer.
  const isInterviewer = session?.status === 'IN_PROGRESS_2' ? !isUser1 : isUser1;
  const peerName = isUser1 ? session?.user2_name : session?.user1_name;
  const displayPeerName = peerName || 'Peer';

  if (!isClient || !session) {
    return <div className="min-h-screen flex items-center justify-center text-aven-text-subtle font-medium">Loading Interview Room...</div>;
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25, mass: 0.8 }}
      className={`flex flex-col p-4 space-y-4 bg-slate-50 overflow-hidden shadow-2xl origin-center ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'relative h-[90vh] max-h-screen rounded-3xl mx-4 my-2 border border-aven-border'}`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3 px-6 rounded-2xl bg-white/80 border border-white shadow-md shadow-aven-primary/5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-aven-primary/10 flex items-center justify-center text-aven-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-aven-text tracking-tight">P2P Interview: {session.topic.replace('_', ' ').toUpperCase()}</h1>
            <p className="text-xs text-aven-text-subtle font-medium">
              Role: <span className={isInterviewer ? 'text-aven-primary' : 'text-emerald-600'}>{isInterviewer ? 'Interviewer' : 'Candidate'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 ${timeLeft < 300 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
            <Clock className="w-4 h-4" /> {formatTimer(timeLeft)}
          </div>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-aven-surface/50 hover:bg-aven-surface text-aven-text transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => router.push(`/learner/p2p-interview/${sessionId}/feedback`)}
            className="px-4 py-2 rounded-xl bg-aven-primary text-white text-sm font-semibold hover:opacity-90 shadow-sm"
          >
            End Interview
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        
        {/* Left: Code Editor */}
        <div className="flex-[3] flex flex-col rounded-3xl bg-white border border-aven-border shadow-xl overflow-hidden relative min-h-0">
          <div className="flex items-center justify-between p-3 px-5 border-b border-aven-border bg-aven-surface/30">
            <h2 className="text-sm font-bold text-aven-text">Collaborative Workspace</h2>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${synced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-xs text-aven-text-subtle font-medium">{synced ? 'Synced' : 'Syncing...'}</span>
            </div>
          </div>
          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
              }}
              onMount={handleEditorDidMount}
            />
          </div>
        </div>

        {/* Right: Video + Instructions */}
        <div className="flex-[2] flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* Video Grid */}
          <div className="grid grid-cols-2 gap-4 h-48 shrink-0">
            {/* Remote Video */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-aven-border shadow-md flex items-center justify-center">
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              {!remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
                  <VideoOff className="w-8 h-8 mb-2" />
                  <span className="text-xs font-medium text-center px-4">Waiting for {displayPeerName}'s video...</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold">
                {displayPeerName}
              </div>
            </div>

            {/* Local Video */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-800 border-2 border-aven-border shadow-md flex items-center justify-center group">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover transform -scale-x-100 transition-opacity ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
                  <VideoOff className="w-8 h-8" />
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold">
                You
              </div>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setIsMicMuted(!isMicMuted)}
                  className={`p-2 rounded-full backdrop-blur-md transition-colors ${isMicMuted ? 'bg-rose-500/80 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={`p-2 rounded-full backdrop-blur-md transition-colors ${isVideoOff ? 'bg-rose-500/80 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
                >
                  {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Instructions Panel */}
          <div className="flex-1 bg-white rounded-3xl border border-aven-border shadow-xl p-6 overflow-y-auto">
            {isInterviewer ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-aven-border pb-4">
                  <div className="px-3 py-1.5 rounded-full bg-aven-primary/10 text-aven-primary text-xs font-black uppercase tracking-widest">
                    Interviewer Guide
                  </div>
                  <span className="text-xs text-aven-text-muted font-medium">Confidential - Do not share your screen</span>
                </div>
                
                <div className="bg-aven-surface/30 p-5 rounded-2xl border border-aven-border">
                  <h3 className="font-extrabold text-aven-text mb-3 uppercase tracking-wider text-xs flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-aven-primary" />
                    Problem Statement
                  </h3>
                  <p className="text-aven-text-subtle text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {session.status === 'IN_PROGRESS_2' ? session.question2_text : session.question1_text}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200">
                  <h3 className="font-extrabold text-amber-900 mb-3 uppercase tracking-wider text-xs flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    Target Solution
                  </h3>
                  <p className="text-amber-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {session.status === 'IN_PROGRESS_2' ? session.question2_solution : session.question1_solution}
                  </p>
                </div>
                
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <h3 className="font-extrabold text-slate-800 mb-3 uppercase tracking-wider text-xs flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    Evaluation Rubric
                  </h3>
                  <ul className="list-none space-y-2">
                    {[
                      "Did they clarify constraints and edge cases before coding?",
                      "Did they explain their algorithm's time & space complexity?",
                      "Is the code syntax clean and reasonably correct?",
                      "Did they dry-run their code with an example?"
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-6">
                <ShieldAlert className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-bold text-aven-text">You are the Candidate</h3>
                <p className="text-sm text-aven-text-subtle">
                  Your peer has the question and will guide you through the interview.
                  Listen carefully, ask clarifying questions, and use the code editor to write your solution.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
