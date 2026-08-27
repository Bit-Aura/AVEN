'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic,
  Upload,
  FileText,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Sparkles,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

import {
  getMyResume,
  uploadResume,
  deleteMyResume,
  startInterviewSession,
  listMyInterviewSessions,
  ResumeRecord,
  MockInterviewSessionSummary,
} from '@/api/client';
import { usePathStore } from '@/store/usePathStore';

export default function MockInterviewHubPage() {
  const router = useRouter();
  const storeTargetRole = usePathStore((state) => state.targetRole) || 'Backend Software Engineer';

  const [resume, setResume] = useState<ResumeRecord | null>(null);
  const [sessions, setSessions] = useState<MockInterviewSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState<string>(storeTargetRole);
  const [interviewType, setInterviewType] = useState<string>('COMPREHENSIVE');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resData, sessData] = await Promise.allSettled([
        getMyResume(),
        listMyInterviewSessions(),
      ]);

      if (resData.status === 'fulfilled') {
        setResume(resData.value);
      } else {
        setResume(null);
      }

      if (sessData.status === 'fulfilled') {
        setSessions(sessData.value);
      }
    } catch (e) {
      console.error('Error loading interview hub data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const newResume = await uploadResume(file);
      setResume(newResume);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to upload and parse resume. Please check file format.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteResume = async () => {
    if (!confirm('Are you sure you want to remove your uploaded resume?')) return;
    try {
      await deleteMyResume();
      setResume(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete resume');
    }
  };

  const handleStartInterview = async () => {
    setIsStarting(true);
    try {
      const res = await startInterviewSession({
        target_role: targetRole || 'Backend Software Engineer',
        interview_type: interviewType,
        resume_id: resume?.id || null,
      });
      router.push(`/learner/interview/${res.session_id}`);
    } catch (err: any) {
      console.error('Could not start interview session:', err);
      alert(err.message || 'Failed to initialize AI Mock Interview session.');
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 px-4">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              AI-Powered Technical & HR Calibration
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Voice-First AI Mock Interview
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Experience dynamic, multi-turn interviews with spoken AI audio. Evaluates your real-time verbal answers, probes superficial claims, maps validated gaps to AVEN skills, and updates your learning path.
            </p>
          </div>

          <button
            onClick={handleStartInterview}
            disabled={isStarting}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-base shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shrink-0"
          >
            {isStarting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Preparing Interview Room...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                Start Voice Interview
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Resume & Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Resume Grounding Card */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-md shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Resume Grounding</h2>
                  <p className="text-xs text-slate-400">Upload your resume to ground project deep-dives & claim verification</p>
                </div>
              </div>

              {resume && (
                <button
                  onClick={handleDeleteResume}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>

            {uploadError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{uploadError}</span>
              </div>
            )}

            {resume ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white truncate max-w-xs">{resume.original_filename}</p>
                      <p className="text-xs text-slate-400">Parsed & Verified for Mock Interview Grounding</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                </div>

                {resume.parsed_data && (
                  <div className="space-y-3 pt-2">
                    {resume.parsed_data.summary && (
                      <p className="text-xs text-slate-300 italic bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                        "{resume.parsed_data.summary}"
                      </p>
                    )}

                    {resume.parsed_data.technical_skills && resume.parsed_data.technical_skills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Claimed Technical Skills:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {resume.parsed_data.technical_skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {resume.parsed_data.projects && resume.parsed_data.projects.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Extracted Projects for Deep-Dive:</p>
                        <div className="space-y-2">
                          {resume.parsed_data.projects.slice(0, 2).map((proj, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-slate-800/30 border border-slate-800 text-xs text-slate-300">
                              <span className="font-semibold text-indigo-300">{proj.name}</span>
                              {proj.technologies?.length > 0 && (
                                <span className="text-slate-400 ml-2">({proj.technologies.join(', ')})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-8 text-center cursor-pointer bg-slate-950/30 hover:bg-indigo-950/10 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  {isUploading ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <p className="text-sm font-semibold text-white mb-1">
                  {isUploading ? 'Parsing Resume with AI...' : 'Click to Upload Resume (PDF, DOCX, TXT)'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Upload up to 5 MB. The AI extractor parses claimed skills, projects, and work experience.
                </p>
              </div>
            )}
          </div>

          {/* Interview Configurator Card */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-md shadow-xl space-y-5">
            <h2 className="text-lg font-bold text-white border-b border-slate-800/80 pb-3">Session Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Target Career Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Backend Software Engineer"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Interview Track Focus
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'COMPREHENSIVE', title: 'Comprehensive', desc: 'HR Intro + Resume + Deep Tech' },
                    { id: 'TECHNICAL', title: 'Technical Deep-Dive', desc: 'Core fundamentals & mechanics' },
                    { id: 'SYSTEM_DESIGN', title: 'System Architecture', desc: 'Scalability & concurrency' },
                    { id: 'BEHAVIORAL', title: 'Behavioral & Leadership', desc: 'Ownership & trade-offs' },
                  ].map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => setInterviewType(track.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        interviewType === track.id
                          ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold text-indigo-300">{track.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{track.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Past Calibration Sessions & Analytics (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-md shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Past Calibration Sessions</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">{sessions.length} Recorded</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> Loading past sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-3">
                <BrainCircuit className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-medium">No past interview sessions yet.</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Click "Start Voice Interview" above to undergo your first adaptive AI interview.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-all space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-white block truncate max-w-[180px]">
                          {sess.target_role}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {sess.interview_type} • Turn {sess.current_turn_index}
                        </span>
                      </div>

                      {sess.status === 'COMPLETED' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                          {typeof sess.overall_score === 'number' ? `${Math.round(sess.overall_score)}%` : 'Completed'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium animate-pulse">
                          In Progress
                        </span>
                      )}
                    </div>

                    {/* Score Badges Breakdown if completed */}
                    {sess.status === 'COMPLETED' && (
                      <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-[10px]">
                        <div className="p-1 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 block">Tech</span>
                          <span className="font-bold text-indigo-300">{sess.technical_score ?? '-'}%</span>
                        </div>
                        <div className="p-1 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 block">Comm</span>
                          <span className="font-bold text-cyan-300">{sess.communication_score ?? '-'}%</span>
                        </div>
                        <div className="p-1 rounded bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 block">Resume</span>
                          <span className="font-bold text-emerald-300">{sess.resume_verification_score ?? '-'}%</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(sess.created_at).toLocaleDateString()}
                      </span>

                      {sess.status === 'COMPLETED' ? (
                        <Link
                          href={`/learner/interview/${sess.id}/report`}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                        >
                          View Report <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/learner/interview/${sess.id}`}
                          className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                        >
                          Resume Room <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
