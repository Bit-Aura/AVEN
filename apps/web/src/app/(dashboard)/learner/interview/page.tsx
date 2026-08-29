'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Sparkles,
  ChevronRight,
  BrainCircuit,
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

/**
 * Enterprise-grade implementation of MockInterviewHubPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
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
    <div className="max-w-6xl mx-auto space-y-6 pb-16 px-4">
      {/* Header Banner */}
      <div className="p-8 bg-aven-primary border border-aven-primary rounded-xl shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/10 border border-white/20 text-aven-base text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={14} className="text-aven-status-active" />
              AI-Powered Technical & HR Calibration
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-aven-base tracking-tight uppercase">
              Voice-First AI Mock Interview
            </h1>
            <p className="text-aven-surface text-sm sm:text-base max-w-2xl font-medium leading-relaxed">
              Experience dynamic, multi-turn interviews with spoken AI audio. Evaluates your real-time verbal answers, probes superficial claims, maps validated gaps to AVEN skills, and updates your learning path.
            </p>
          </div>

          <button
            onClick={handleStartInterview}
            disabled={isStarting}
            className="group inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-aven-status-active hover:brightness-110 text-aven-text font-black text-xs uppercase tracking-widest shadow-md transition-all disabled:opacity-50 disabled:pointer-events-none shrink-0 border border-aven-status-active"
          >
            {isStarting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Preparing Room...
              </>
            ) : (
              <>
                <Mic size={16} className="text-aven-text" />
                Start Voice Interview
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Resume & Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Resume Grounding Card */}
          <div className="p-6 rounded-xl bg-aven-surface border border-aven-border space-y-5">
            <div className="flex items-center justify-between border-b border-aven-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-aven-primary/10 border border-aven-primary/20 flex items-center justify-center text-aven-secondary">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-aven-text uppercase tracking-tight">Resume Grounding</h2>
                  <p className="text-xs text-aven-text-subtle font-medium">Upload your resume to ground project deep-dives & claim verification</p>
                </div>
              </div>

              {resume && (
                <button
                  onClick={handleDeleteResume}
                  className="text-[10px] text-red-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-50 border border-red-200 hover:border-red-300 font-black uppercase tracking-widest transition-colors"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              )}
            </div>

            {uploadError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                <AlertCircle size={15} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {resume ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-aven-surface border border-aven-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-aven-primary border border-aven-primary flex items-center justify-center text-aven-base font-black text-[10px]">
                      PDF
                    </div>
                    <div>
                      <p className="text-sm font-black text-aven-text truncate max-w-xs">{resume.original_filename}</p>
                      <p className="text-[10px] text-aven-text-subtle font-bold uppercase tracking-widest">Parsed & Verified for Grounding</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-aven-base text-aven-text border border-aven-text text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle2 size={12} /> Ready
                  </span>
                </div>

                {resume.parsed_data && (
                  <div className="space-y-3 pt-2">
                    {resume.parsed_data.summary && (
                      <p className="text-xs text-aven-text-subtle font-medium bg-aven-base p-4 rounded border border-aven-border leading-relaxed">
                        "{resume.parsed_data.summary}"
                      </p>
                    )}

                    {resume.parsed_data.technical_skills && resume.parsed_data.technical_skills.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-aven-text uppercase tracking-widest mb-2">Claimed Technical Skills:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {resume.parsed_data.technical_skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded bg-aven-surface border border-aven-border text-aven-text text-[10px] font-bold uppercase tracking-widest"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {resume.parsed_data.projects && resume.parsed_data.projects.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-aven-text uppercase tracking-widest mb-2">Extracted Projects for Deep-Dive:</p>
                        <div className="space-y-2">
                          {resume.parsed_data.projects.slice(0, 2).map((proj, idx) => (
                            <div key={idx} className="p-3 rounded bg-aven-surface border border-aven-border text-xs text-aven-text-subtle font-medium">
                              <span className="font-black text-aven-text">{proj.name}</span>
                              {proj.technologies?.length > 0 && (
                                <span className="ml-2 font-bold text-[10px] uppercase tracking-widest">({proj.technologies.join(', ')})</span>
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
                className="p-8 text-center cursor-pointer bg-aven-base border border-aven-text/20 hover:border-aven-text/40 rounded-xl transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <div className="w-12 h-12 rounded bg-aven-base border border-aven-border text-aven-text flex items-center justify-center mx-auto mb-3 transition-colors">
                  {isUploading ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <Upload size={20} />
                  )}
                </div>
                <p className="text-sm font-black text-aven-text uppercase tracking-tight mb-1">
                  {isUploading ? 'Parsing Resume...' : 'Click to Upload Resume (PDF, DOCX, TXT)'}
                </p>
                <p className="text-xs text-aven-text-subtle max-w-sm mx-auto font-medium">
                  Upload up to 5 MB. The AI extractor parses claimed skills, projects, and work experience.
                </p>
              </div>
            )}
          </div>

          {/* Interview Configurator Card */}
          <div className="p-6 rounded-xl bg-aven-surface border border-aven-border space-y-5">
            <h2 className="text-base font-black text-aven-secondary uppercase tracking-tight border-b border-aven-border pb-3">Session Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-aven-text mb-1.5 uppercase tracking-widest">
                  Target Career Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Backend Software Engineer"
                  className="w-full px-4 py-3 rounded bg-aven-base border border-aven-border text-aven-text placeholder-[#a3a198] text-sm focus:outline-none focus:border-aven-text focus:ring-0 transition-colors font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-aven-text mb-1.5 uppercase tracking-widest">
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
                      className={`p-4 rounded-xl border text-left transition-all ${
                        interviewType === track.id
                          ? 'bg-aven-secondary/10 border-aven-primary text-aven-primary'
                          : 'bg-aven-base border-aven-text/20 hover:border-aven-text/40'
                      }`}
                    >
                      <p className={`text-xs font-black uppercase tracking-widest ${interviewType === track.id ? 'text-aven-primary' : 'text-aven-text'}`}>{track.title}</p>
                      <p className={`text-[10px] mt-1 font-medium ${interviewType === track.id ? 'text-aven-primary/80' : 'text-aven-text-subtle'}`}>{track.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Past Calibration Sessions & Analytics (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-xl bg-aven-surface border border-aven-border space-y-5">
            <div className="flex items-center justify-between border-b border-aven-border pb-3">
              <div className="flex items-center gap-2 text-aven-secondary">
                <Award size={20} />
                <h2 className="text-base font-black uppercase tracking-tight">Past Sessions</h2>
              </div>
              <span className="text-[10px] text-aven-text-subtle font-bold uppercase tracking-widest">{sessions.length} Recorded</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-aven-text-subtle text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-aven-text" /> Loading...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-12 text-center bg-aven-base border border-aven-text/20 rounded-xl space-y-4">
                <BrainCircuit size={36} className="mx-auto text-aven-text-subtle" />
                <p className="text-base font-black text-aven-text uppercase tracking-tight">No past interview sessions yet</p>
                <p className="text-sm text-aven-text-subtle max-w-lg mx-auto font-medium leading-relaxed">
                  Click "Start Voice Interview" above to undergo your first adaptive AI interview.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-4 rounded-xl bg-aven-surface border border-aven-border hover:border-aven-text/30 transition-all space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-black text-aven-text uppercase tracking-tight block truncate max-w-[180px]">
                          {sess.target_role}
                        </span>
                        <span className="text-[10px] font-bold text-aven-text-subtle uppercase tracking-widest block mt-1">
                          {sess.interview_type} • Turn {sess.current_turn_index}
                        </span>
                      </div>

                      {sess.status === 'COMPLETED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-aven-text text-aven-base border border-aven-text font-black uppercase tracking-widest">
                          {typeof sess.overall_score === 'number' ? `${Math.round(sess.overall_score)}%` : 'Completed'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-aven-status-active text-aven-text border border-aven-status-active font-black uppercase tracking-widest animate-pulse">
                          In Progress
                        </span>
                      )}
                    </div>

                    {/* Score Badges Breakdown if completed */}
                    {sess.status === 'COMPLETED' && (
                      <div className="grid grid-cols-3 gap-1.5 pt-2 text-center text-[10px]">
                        <div className="p-1.5 rounded bg-aven-base border border-aven-border">
                          <span className="text-aven-text-subtle block font-bold uppercase tracking-widest">Tech</span>
                          <span className="font-black text-aven-text text-xs">{sess.technical_score ?? '-'}%</span>
                        </div>
                        <div className="p-1.5 rounded bg-aven-base border border-aven-border">
                          <span className="text-aven-text-subtle block font-bold uppercase tracking-widest">Comm</span>
                          <span className="font-black text-aven-text text-xs">{sess.communication_score ?? '-'}%</span>
                        </div>
                        <div className="p-1.5 rounded bg-aven-base border border-aven-border">
                          <span className="text-aven-text-subtle block font-bold uppercase tracking-widest">Resume</span>
                          <span className="font-black text-aven-text text-xs">{sess.resume_verification_score ?? '-'}%</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-aven-border text-[10px]">
                      <span className="text-aven-text-subtle font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={12} />
                        {new Date(sess.created_at).toLocaleDateString()}
                      </span>

                      {sess.status === 'COMPLETED' ? (
                        <Link
                          href={`/learner/interview/${sess.id}/report`}
                          className="text-aven-text font-black uppercase tracking-widest inline-flex items-center gap-1 hover:bg-aven-border px-2 py-1 rounded transition-colors"
                        >
                          View Report <ChevronRight size={12} />
                        </Link>
                      ) : (
                        <Link
                          href={`/learner/interview/${sess.id}`}
                          className="text-aven-text font-black uppercase tracking-widest inline-flex items-center gap-1 hover:bg-aven-border px-2 py-1 rounded transition-colors"
                        >
                          Resume Room <ChevronRight size={12} />
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
