'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { getP2PSession } from '@/api/client';
import { Editor } from '@monaco-editor/react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useYjs } from '@/hooks/useYjs';
import { Clock, Users, ArrowRight, ShieldAlert, CheckCircle, Video, Mic, MicOff, VideoOff } from 'lucide-react';

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

  // Editor ref for Yjs binding
  const editorRef = useRef<any>(null);
  const { synced } = useYjs(sessionId, editorRef);

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

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="h-[90vh] max-h-screen flex flex-col p-4 space-y-4">
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
            <div className="relative rounded-2xl overflow-hidden bg-slate-800 border-2 border-aven-border shadow-md flex items-center justify-center">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold">
                You
              </div>
            </div>
          </div>

          {/* Instructions Panel */}
          <div className="flex-1 bg-white rounded-3xl border border-aven-border shadow-xl p-6 overflow-y-auto">
            {isInterviewer ? (
              <div className="space-y-6">
                <div className="inline-block px-3 py-1 rounded-full bg-aven-primary/10 text-aven-primary text-xs font-bold uppercase tracking-wider">
                  Interviewer Guide
                </div>
                <div>
                  <h3 className="font-bold text-aven-text mb-2">Question:</h3>
                  <p className="text-aven-text-subtle text-sm leading-relaxed">
                    {session.status === 'IN_PROGRESS_2' ? session.question2_text : session.question1_text}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <h3 className="font-bold text-amber-900 mb-2 text-sm">Solution Guidelines:</h3>
                  <p className="text-amber-800 text-sm leading-relaxed">
                    {session.status === 'IN_PROGRESS_2' ? session.question2_solution : session.question1_solution}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-aven-text text-sm">Rubric to look for:</h3>
                  <ul className="list-disc list-inside text-sm text-aven-text-subtle space-y-1">
                    <li>Did they clarify the constraints before coding?</li>
                    <li>Did they explain their approach effectively?</li>
                    <li>Is the code syntax reasonably correct?</li>
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
    </div>
  );
}
