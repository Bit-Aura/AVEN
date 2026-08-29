'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Code, Server, Search, RefreshCw, XCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { joinP2PQueue, checkP2PQueueStatus } from '@/api/client';

export default function P2PInterviewLobbyPage() {
  const router = useRouter();
  const { user } = useUser();
  const [selectedTopic, setSelectedTopic] = useState<string>('data_structures');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [matchedSessionId, setMatchedSessionId] = useState<string | null>(null);
  const [matchedPeerName, setMatchedPeerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const topics = [
    { id: 'data_structures', name: 'Data Structures & Algorithms', icon: Code, description: 'Classic algorithmic problem solving (Arrays, Trees, Graphs, DP)' },
    { id: 'system_design', name: 'System Design', icon: Server, description: 'Design scalable distributed systems and backend architecture' },
    { id: 'frontend', name: 'Frontend Architecture', icon: Search, description: 'React, component design, state management, and web performance' },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSearching && user && !matchedSessionId) {
      // Poll queue status every 3 seconds
      interval = setInterval(async () => {
        try {
          const res = await checkP2PQueueStatus(user.id);
          if (res.status === 'MATCHED' && res.session_id) {
            clearInterval(interval);
            setMatchedSessionId(res.session_id.toString());
            setMatchedPeerName(res.peer_name || 'Anonymous Learner');
          }
        } catch (err: any) {
          console.error("Error checking queue status", err);
        }
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSearching, user, matchedSessionId]);

  const handleJoinQueue = async () => {
    if (!user) return;
    setError(null);
    setIsSearching(true);
    setMatchedSessionId(null);
    
    try {
      const res = await joinP2PQueue({
        user_id: user.id,
        topic: selectedTopic
      });
      
      if (res.status === 'MATCHED' && res.session_id) {
        setMatchedSessionId(res.session_id.toString());
        setMatchedPeerName(res.peer_name || 'Anonymous Learner');
      }
    } catch (err: any) {
      console.error("Failed to join queue:", err);
      setError(err.message || "Failed to join matchmaking queue.");
      setIsSearching(false);
    }
  };

  const handleCancelSearch = () => {
    // In a real app, we'd hit a DELETE /queue endpoint here.
    setIsSearching(false);
    setMatchedSessionId(null);
    setMatchedPeerName(null);
  };

  const handleAcceptMatch = () => {
    if (matchedSessionId) {
      router.push(`/learner/p2p-interview/${matchedSessionId}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 pt-8 px-4">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-aven-primary/10 rounded-2xl flex items-center justify-center">
          <Users className="w-8 h-8 text-aven-primary" />
        </div>
        <h1 className="text-3xl font-bold text-aven-text tracking-tight">Peer-to-Peer Mock Interviews</h1>
        <p className="text-aven-text-subtle text-lg max-w-2xl mx-auto">
          Practice your interviewing skills by conducting real-time mock interviews with other learners. 
          You will take turns being the candidate and the interviewer in a structured 60-minute session.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-medium text-sm text-center">
          {error}
        </div>
      )}

      {/* Main Container */}
      {!isSearching && !matchedSessionId ? (
        <div className="bg-white rounded-3xl border border-aven-border shadow-xl p-8 space-y-8 transition-all">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-aven-text">Select Interview Topic</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topics.map((topic) => {
                const isSelected = selectedTopic === topic.id;
                const Icon = topic.icon;
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`text-left p-5 rounded-2xl border transition-all ${
                      isSelected 
                        ? 'border-aven-primary bg-aven-primary/5 shadow-md shadow-aven-primary/10 ring-2 ring-aven-primary/20' 
                        : 'border-aven-border bg-white hover:border-aven-primary/40 hover:bg-aven-surface/50'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-3 ${isSelected ? 'text-aven-primary' : 'text-aven-text-muted'}`} />
                    <h3 className={`font-semibold mb-1 ${isSelected ? 'text-aven-primary' : 'text-aven-text'}`}>
                      {topic.name}
                    </h3>
                    <p className="text-xs text-aven-text-subtle leading-relaxed">
                      {topic.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-aven-surface/30 p-6 rounded-2xl border border-aven-border/50">
            <h3 className="font-semibold text-aven-text text-sm uppercase tracking-wider mb-4">How it works</h3>
            <ul className="space-y-3 text-sm text-aven-text-subtle">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-aven-primary/10 text-aven-primary flex items-center justify-center font-bold text-[10px]">1</span>
                Match with a peer practicing the same topic.
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-aven-primary/10 text-aven-primary flex items-center justify-center font-bold text-[10px]">2</span>
                Collaborate in real-time using built-in video, audio, and a shared code editor.
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-aven-primary/10 text-aven-primary flex items-center justify-center font-bold text-[10px]">3</span>
                Take turns: 30 minutes as the interviewer, 30 minutes as the candidate.
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-aven-primary/10 text-aven-primary flex items-center justify-center font-bold text-[10px]">4</span>
                Provide and receive actionable feedback on communication and technical accuracy.
              </li>
            </ul>
          </div>

          <button
            onClick={handleJoinQueue}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-aven-primary to-aven-secondary hover:opacity-90 text-white font-bold text-lg shadow-lg shadow-aven-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Find a Peer Match
          </button>
        </div>
      ) : matchedSessionId ? (
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl shadow-emerald-500/10 p-12 text-center space-y-8 transition-all transform scale-100">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping" />
            <div className="relative w-full h-full rounded-full bg-emerald-50 border-4 border-emerald-500 flex items-center justify-center">
              <Users className="w-12 h-12 text-emerald-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-aven-text">Match Found!</h2>
            <p className="text-aven-text-subtle text-lg">
              A peer <span className="font-semibold text-aven-text">({matchedPeerName})</span> is ready to practice <span className="font-semibold text-emerald-600">{topics.find(t => t.id === selectedTopic)?.name}</span> with you.
            </p>
            <p className="text-sm text-aven-text-muted mt-4">
              Your camera and microphone will be turned on when you join the room.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={handleCancelSearch}
              className="w-full sm:w-auto px-8 py-3 rounded-xl border-2 border-aven-border hover:bg-aven-surface text-aven-text font-bold transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAcceptMatch}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/30 transition-all hover:-translate-y-0.5"
            >
              Join Room Now
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-aven-border shadow-xl p-12 text-center space-y-8 transition-all">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 rounded-full animate-ping bg-aven-primary/20" />
            <div className="absolute inset-4 rounded-full animate-ping bg-aven-primary/30" style={{ animationDelay: '500ms' }} />
            <div className="relative w-full h-full rounded-full bg-aven-primary/10 border-4 border-aven-primary flex items-center justify-center">
              <Search className="w-12 h-12 text-aven-primary animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-aven-text">Searching for a Match...</h2>
            <p className="text-aven-text-subtle">
              Looking for someone practicing <span className="font-semibold text-aven-primary">{topics.find(t => t.id === selectedTopic)?.name}</span>.
            </p>
            <p className="text-xs text-aven-text-muted">Expected wait time: 1-3 minutes</p>
          </div>

          <button
            onClick={handleCancelSearch}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-aven-border hover:bg-aven-surface text-aven-text-subtle hover:text-aven-text font-medium transition-colors"
          >
            <XCircle className="w-4 h-4" /> Cancel Search
          </button>
        </div>
      )}
    </div>
  );
}
