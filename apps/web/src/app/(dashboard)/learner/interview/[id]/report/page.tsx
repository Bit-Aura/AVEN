'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Award,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Compass,
  Code2,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  HelpCircle,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

import {
  getInterviewSession,
  getInterviewReport,
  MockInterviewSessionDetail,
  InterviewReportSummary,
} from '@/api/client';

/**
 * Enterprise-grade implementation of InterviewReportPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function InterviewReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Number(params?.id);

  const [session, setSession] = useState<MockInterviewSessionDetail | null>(null);
  const [report, setReport] = useState<InterviewReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      if (!sessionId) return;
      setIsLoading(true);
      try {
        const [sessData, repData] = await Promise.all([
          getInterviewSession(sessionId),
          getInterviewReport(sessionId),
        ]);
        setSession(sessData);
        setReport(repData || sessData.feedback_summary || null);
      } catch (err: any) {
        console.error('Failed to load interview report:', err);
        setError(err.message || 'Could not load calibration report.');
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-slate-300 font-semibold text-base">Synthesizing Comprehensive Calibration Report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-100">Report Unavailable</h2>
        <p className="text-sm text-slate-300">{error || 'No synthesized report data found for this session.'}</p>
        <Link
          href="/learner/interview"
          className="inline-block px-6 py-2.5 rounded-xl bg-slate-800 text-slate-100 text-sm font-semibold hover:bg-slate-700"
        >
          Back to Mock Interview Hub
        </Link>
      </div>
    );
  }

  const overallScore = Math.round(report.overall_score || 75);
  const scoreColor =
    overallScore >= 80 ? 'text-emerald-400' : overallScore >= 65 ? 'text-cyan-400' : 'text-amber-400';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Interview Calibration Synthesized
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              {session?.target_role || 'Engineering'} Calibration Report
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Multi-turn evidence synthesis comparing verbal mastery, resume claims, and target role rubrics.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shrink-0">
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Overall Score</span>
              <span className="text-[11px] text-slate-400">Benchmark: 70%</span>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center font-extrabold text-2xl shadow-inner">
              <span className={scoreColor}>{overallScore}%</span>
            </div>
          </div>
        </div>

        {/* 4 Score Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <span className="text-xs text-slate-400 font-medium">Technical Depth</span>
            <p className="text-xl font-bold text-aven-primary">{Math.round(report.technical_score || 0)}%</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <span className="text-xs text-slate-400 font-medium">Communication Clarity</span>
            <p className="text-xl font-bold text-cyan-300">{Math.round(report.communication_score || 0)}%</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <span className="text-xs text-slate-400 font-medium">Resume Consistency</span>
            <p className="text-xl font-bold text-emerald-300">{Math.round(report.resume_verification_score || 0)}%</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <span className="text-xs text-slate-400 font-medium">AI Confidence</span>
            <p className="text-xl font-bold text-purple-300">{Math.round(report.confidence_score || 85)}%</p>
          </div>
        </div>
      </div>

      {/* Learning Path Automated Replanning Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/30 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Automated Learning Path Calibration</h2>
            <p className="text-xs text-slate-300">
              AVEN has recomputed your personalized skill graph based on evidence gathered in this session.
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
          {report.summary}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/learner"
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20"
          >
            <Compass className="w-4 h-4" /> View Updated Learning Path
          </Link>
          <Link
            href="/learner/simulator"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center gap-2 transition-all"
          >
            <Code2 className="w-4 h-4" /> Practice in Sandbox
          </Link>
          <Link
            href="/learner/interview"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center gap-2 transition-all ml-auto"
          >
            Start New Interview
          </Link>
        </div>
      </div>

      {/* Two Column Grid: Strengths vs Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verified Strengths */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100">Verified Technical Strengths</h3>
          </div>

          {report.verified_strengths && report.verified_strengths.length > 0 ? (
            <ul className="space-y-2.5">
              {report.verified_strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">No specific strengths identified in this session.</p>
          )}
        </div>

        {/* Identified Skill Gaps (Mapped to Canonical AVEN Skills) */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">Identified Gaps (Mapped to Curriculum)</h3>
          </div>

          {report.canonical_skill_gaps && report.canonical_skill_gaps.length > 0 ? (
            <div className="space-y-3">
              {report.canonical_skill_gaps.map((gap, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-aven-primary">
                      {gap.canonical_skill_name || 'General Skill'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        gap.severity === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {gap.severity} Severity
                    </span>
                  </div>
                  <p className="text-slate-300">{gap.description}</p>
                  {gap.evidence && (
                    <p className="text-slate-400 italic bg-slate-900/60 p-2 rounded border border-slate-800/80">
                      "{gap.evidence}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No critical technical gaps detected.</p>
          )}
        </div>
      </div>

      {/* Resume Claims Verification Matrix */}
      {report.resume_verification_matrix && report.resume_verification_matrix.length > 0 && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <FileCheck className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-slate-100">Resume Claim Verification Matrix</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.resume_verification_matrix.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{item.claim}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      item.status === 'SUPPORTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : item.status === 'PARTIALLY_SUPPORTED'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{item.evidence}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
