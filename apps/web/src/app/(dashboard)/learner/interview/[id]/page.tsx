'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  ShieldAlert,
  Award,
  CheckCircle,
  HelpCircle,
  Square,
  Radio,
  X,
  Keyboard,
} from 'lucide-react';

import {
  getInterviewSession,
  submitInterviewAnswer,
  completeInterviewSession,
  MockInterviewSessionDetail,
  MockInterviewTurnData,
} from '@/api/client';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';

/**
 * Enterprise-grade implementation of LiveInterviewRoomPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function LiveInterviewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Number(params?.id);

  const [session, setSession] = useState<MockInterviewSessionDetail | null>(null);
  const [currentTurn, setCurrentTurn] = useState<MockInterviewTurnData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [hasSpokenTurn, setHasSpokenTurn] = useState<boolean>(false);
  const [autoSpeakQuestion, setAutoSpeakQuestion] = useState<boolean>(true);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isSupported: isSttSupported,
    isTtsSupported,
    isListening,
    isSpeaking,
    isTranscribing,
    recordingSeconds,
    audioLevel,
    transcript,
    interimTranscript,
    error: speechError,
    clearError: clearSpeechError,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
    speak,
    stopSpeaking,
  } = useSpeechRecognition();

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Load Session Data
  const loadSession = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const data = await getInterviewSession(sessionId);
      setSession(data);

      if (data.status === 'COMPLETED') {
        router.push(`/learner/interview/${sessionId}/report`);
        return;
      }

      // Find active turn
      const activeTurn = data.turns.find((t) => t.turn_index === data.current_turn_index) || data.turns[data.turns.length - 1];
      setCurrentTurn(activeTurn || null);
    } catch (err: any) {
      console.error('Error fetching session:', err);
      setErrorMessage(err.message || 'Could not load interview session.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  // Auto-speak question when active turn changes
  useEffect(() => {
    if (currentTurn && ttsEnabled && !hasSpokenTurn && isTtsSupported) {
      speak(currentTurn.question_text, () => {
        setHasSpokenTurn(true);
      });
    }
  }, [currentTurn, ttsEnabled, isTtsSupported, hasSpokenTurn, speak]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      startListening();
    }
  };

  const handleReplayQuestion = () => {
    if (currentTurn) {
      speak(currentTurn.question_text);
    }
  };

  const handleSubmitAnswer = async () => {
    const fullAnswer = (transcript + ' ' + interimTranscript).trim();
    if (!fullAnswer) {
      alert('Please speak or type your answer before submitting.');
      return;
    }

    if (isListening) {
      stopListening();
    }
    stopSpeaking();

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitInterviewAnswer(
        sessionId,
        fullAnswer,
        isListening || transcript ? 'VOICE' : 'TEXT'
      );

      resetTranscript();
      setHasSpokenTurn(false);

      if (res.status === 'COMPLETED' || res.next_action === 'COMPLETE') {
        router.push(`/learner/interview/${sessionId}/report`);
      } else {
        // Refresh session state with new turn
        await loadSession();
      }
    } catch (err: any) {
      console.error('Answer submission failed:', err);
      setErrorMessage(err.message || 'Failed to submit interview answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteEarly = async () => {
    if (!confirm('Are you sure you want to end the interview now? The AI will synthesize your report from completed turns.')) {
      return;
    }

    setIsCompleting(true);
    try {
      await completeInterviewSession(sessionId);
      router.push(`/learner/interview/${sessionId}/report`);
    } catch (err: any) {
      alert(err.message || 'Failed to finalize interview report.');
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-aven-text-subtle font-semibold text-base">Entering AI Calibration Chamber...</p>
      </div>
    );
  }

  if (errorMessage && !session) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-100">Interview Session Error</h2>
        <p className="text-sm text-rose-200">{errorMessage}</p>
        <Link
          href="/learner/interview"
          className="inline-block px-6 py-2.5 rounded-xl bg-slate-800 text-slate-100 text-sm font-semibold hover:bg-slate-700"
        >
          Return to Interview Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4">
      {/* Top Session Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/80 border border-white shadow-md shadow-aven-primary/5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-aven-primary/10 border border-aven-primary/30 flex items-center justify-center text-aven-primary">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-aven-text flex items-center gap-2">
              {session?.target_role}
              <span className="px-2 py-0.5 rounded-md bg-aven-primary/20 text-aven-primary text-[10px] uppercase font-bold tracking-wider">
                {session?.current_phase || 'TECHNICAL'}
              </span>
            </h1>
            <p className="text-xs text-aven-text-subtle">
              Turn {(session?.current_turn_index || 0) + 1} of 8 • {session?.interview_type} Mode
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-2.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
              ttsEnabled
                ? 'bg-aven-primary/10 border-aven-primary/30 text-aven-primary'
                : 'bg-aven-surface border-aven-border text-aven-text-subtle'
            }`}
            title={ttsEnabled ? 'Disable Spoken AI Audio' : 'Enable Spoken AI Audio'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{ttsEnabled ? 'AI Voice ON' : 'AI Voice Muted'}</span>
          </button>

          <button
            onClick={handleCompleteEarly}
            disabled={isCompleting}
            className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {isCompleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
            <span>End Session</span>
          </button>
        </div>
      </div>

      {/* Main AI Interviewer Visualizer Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-aven-surface/30 border border-white shadow-2xl shadow-aven-primary/5 p-8 space-y-8 backdrop-blur-sm">
        {/* Animated Avatar Centerpiece */}
        <div className="flex flex-col items-center justify-center space-y-10 pt-6 pb-2">
          <div className="relative">
            {/* Pulsing rings during speech */}
            {(isSpeaking || isListening) && (
              <div className={`absolute inset-0 -m-6 rounded-full animate-ping opacity-20 ${isSpeaking ? 'bg-aven-primary' : 'bg-cyan-400'}`} />
            )}
            <div
              className={`relative z-10 w-24 h-24 rounded-full border-4 flex items-center justify-center shadow-xl transition-all duration-500 ${
                isSpeaking
                  ? 'border-aven-primary bg-white text-aven-primary shadow-aven-primary/30 scale-105 ring-4 ring-aven-primary/10'
                  : isListening
                  ? 'border-cyan-400 bg-white text-cyan-500 shadow-cyan-500/30 scale-105 ring-4 ring-cyan-400/10'
                  : 'border-aven-surface bg-white text-aven-text-muted shadow-sm'
              }`}
            >
              <Bot className="w-12 h-12" />
            </div>
          </div>

          {/* Status Capsule */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-white shadow-sm text-xs font-semibold transition-all">
              {isSpeaking ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-aven-primary animate-ping" />
                  <span className="text-aven-primary">AI Interviewer Speaking...</span>
                </>
              ) : isTranscribing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600" />
                  <span className="text-cyan-700">Transcribing Spoken Answer...</span>
                </>
              ) : isListening ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-rose-600">Recording ({formatTimer(recordingSeconds)}) • Speak Clearly</span>
                </>
              ) : isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span className="text-amber-600">Calibrating & Analyzing Response...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-aven-border" />
                  <span className="text-aven-text-subtle">Awaiting Verbal Response</span>
                </>
              )}
            </div>

            {/* Live Reactive Audio Waveform Graphic */}
            <div className="flex items-center justify-center gap-1.5 h-7">
              {[25, 60, 40, 85, 50, 95, 70, 100, 55, 80, 45, 65, 30].map((baseHeight, idx) => {
                let dynamicHeight = 4;
                if (isSpeaking) {
                  dynamicHeight = Math.max(12, Math.round((baseHeight * Math.sin(idx + 1)) % 24));
                } else if (isListening) {
                  const factor = Math.max(0.2, audioLevel / 100);
                  dynamicHeight = Math.max(6, Math.round(baseHeight * factor * 0.28));
                }
                return (
                  <div
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isSpeaking
                        ? 'bg-aven-primary animate-pulse'
                        : isListening
                        ? 'bg-gradient-to-t from-cyan-400 to-rose-400'
                        : 'bg-aven-border'
                    }`}
                    style={{ height: `${dynamicHeight}px` }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Current Question Bubble */}
        <div className="relative rounded-2xl bg-aven-surface/40 border border-transparent p-6 space-y-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-aven-primary/10 text-aven-primary font-bold text-xs">
                Question {((currentTurn?.turn_index || 0) + 1)}
              </span>
              <span className="text-xs text-aven-text-subtle font-medium uppercase tracking-wider">
                {currentTurn?.category?.replace('_', ' ')}
              </span>
            </div>

            <button
              onClick={handleReplayQuestion}
              className="text-xs text-aven-primary hover:text-aven-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-aven-primary/20 hover:bg-aven-primary/5 transition-colors shadow-sm"
            >
              <Volume2 className="w-3.5 h-3.5" /> Replay Audio
            </button>
          </div>

          <p className="text-lg font-medium text-aven-text leading-relaxed">
            "{currentTurn?.question_text}"
          </p>
        </div>

        {/* Learner Speech-To-Text / Text Fallback Input Box */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-aven-text-subtle uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-600" /> Your Spoken Answer
            </label>

            {transcript && (
              <button
                onClick={resetTranscript}
                className="text-xs text-aven-text-subtle hover:text-aven-text font-medium"
              >
                Clear Transcript
              </button>
            )}
          </div>

          {speechError && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start justify-between gap-3 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div className="space-y-1.5">
                  <p className="font-medium">{speechError}</p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={() => {
                        clearSpeechError();
                        textareaRef.current?.focus();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-[11px] transition-colors"
                    >
                      <Keyboard className="w-3 h-3" /> Type Answer Directly
                    </button>
                    <button
                      onClick={() => {
                        clearSpeechError();
                        startListening();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-aven-surface text-aven-text font-medium text-[11px] transition-colors border border-aven-border shadow-sm"
                    >
                      <Mic className="w-3 h-3 text-cyan-600" /> Try Mic Again
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={clearSpeechError}
                className="text-amber-500 hover:text-amber-700 p-1 rounded-md hover:bg-amber-100 transition-colors shrink-0"
                title="Dismiss Notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={4}
              value={transcript + (interimTranscript ? ` ${interimTranscript}` : '')}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening... Speak clearly into your microphone.'
                  : 'Speak through your microphone or type your answer directly here...'
              }
              className={`w-full p-4 rounded-2xl bg-white border shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] text-aven-text placeholder-aven-text-muted text-sm leading-relaxed focus:outline-none transition-all duration-300 ${
                isListening
                  ? 'border-cyan-400 ring-4 ring-cyan-400/10'
                  : 'border-aven-border focus:border-aven-primary focus:ring-4 focus:ring-aven-primary/10'
              }`}
            />

            {interimTranscript && (
              <span className="absolute bottom-3 right-3 text-[10px] text-cyan-600 animate-pulse font-medium">
                Live transcribing...
              </span>
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              onClick={handleToggleListening}
              disabled={isTranscribing}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm hover:-translate-y-0.5 active:translate-y-0 ${
                isTranscribing
                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 cursor-wait'
                  : isListening
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                  : 'bg-white border border-aven-border hover:bg-aven-surface text-aven-text hover:shadow-md'
              }`}
            >
              {isTranscribing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-700" /> Transcribing Speech...
                </>
              ) : isListening ? (
                <>
                  <Square className="w-4 h-4 fill-white" /> Stop & Done ({formatTimer(recordingSeconds)})
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" /> Start Speaking
                </>
              )}
            </button>

            <button
              onClick={handleSubmitAnswer}
              disabled={isSubmitting || (!transcript.trim() && !interimTranscript.trim())}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-aven-primary to-aven-secondary hover:opacity-90 text-white font-bold text-sm shadow-lg shadow-aven-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating Answer...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Answer
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Turn History Accordion */}
      {session && session.turns.length > 1 && (
        <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-md border border-white shadow-md shadow-aven-primary/5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-aven-text-subtle">Previous Turns in this Session</h3>
          <div className="space-y-3">
            {session.turns
              .filter((t) => t.turn_index < session.current_turn_index && t.learner_answer)
              .map((t) => (
                <div key={t.id} className="p-4 rounded-xl bg-white border border-aven-primary/10 shadow-sm text-xs space-y-2 transition-all hover:shadow-md">
                  <div className="flex items-center justify-between text-aven-text-subtle">
                    <span className="font-semibold text-aven-primary">Turn {t.turn_index + 1} ({t.category})</span>
                    {typeof t.answer_score === 'number' && (
                      <span className="font-bold text-emerald-600">{Math.round(t.answer_score)}%</span>
                    )}
                  </div>
                  <p className="text-aven-text font-medium">Q: {t.question_text}</p>
                  <p className="text-aven-text-subtle italic bg-white p-2 rounded-lg border border-aven-border/60">
                    "{t.learner_answer}"
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
