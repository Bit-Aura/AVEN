'use client';

import Link from 'next/link';
import { 
  BrainCircuit, 
  ArrowRight, 
  ShieldCheck, 
  Network, 
  Radar, 
  Award, 
  Terminal, 
  Sparkles, 
  CheckCircle2, 
  Compass 
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-slate-100 font-sans selection:bg-brand-500/30 overflow-hidden relative">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-brand-500/15 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-96 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <nav className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center relative z-10 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-glow-indigo">
            <BrainCircuit className="text-white" size={22} />
          </div>
          <div>
            <span className="font-extrabold text-white tracking-tight text-xl">PathFinder</span>
            <span className="ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
              AVEN
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/learner"
            className="text-xs font-bold text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-surface transition-colors"
          >
            Live Demo
          </Link>
          <Link
            href="/diagnostic"
            className="flex items-center gap-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl shadow-glow-indigo transition-all"
          >
            <span>Start Diagnostic</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 relative z-10 space-y-32">
        <section className="text-center flex flex-col items-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-bold mb-6 shadow-glow-indigo">
            <Sparkles size={14} className="text-brand-400" />
            <span>Deterministic Prerequisite Graphs • Zero LLM Hallucinations</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
            Stop Guessing. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400">
              Start Knowing Your Real Readiness.
            </span>
          </h1>

          <p className="text-base md:text-xl text-slate-400 max-w-2xl leading-relaxed mb-10">
            An AI-native career intelligence engine that builds topologically sound skill paths, tracks Bayesian Knowledge Tracing priors, and cryptographically signs your portfolio.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <Link
              href="/diagnostic"
              className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-sm shadow-glow-indigo transition-all"
            >
              <Compass size={18} />
              <span>Launch Cold-Start Diagnostic</span>
            </Link>
            <Link
              href="/learner"
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-xl bg-surface hover:bg-surface-secondary text-slate-200 hover:text-white border border-border font-bold text-sm transition-all"
            >
              <span>Explore Active Dashboard</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: DAG vs Video Progress */}
          <div className="p-8 rounded-2xl bg-surface border border-border shadow-glass hover:border-brand-500/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="text-emerald-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Bayesian Readiness, Not Video Bars</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard MOOCs give 100% progress for passive video completion. PathFinder estimates actual posterior mastery through verified micro-assessments and sandbox telemetry.
            </p>
          </div>

          {/* Card 2: Date-Delta Engine */}
          <div className="p-8 rounded-2xl bg-surface border border-border shadow-glass hover:border-brand-500/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Network className="text-indigo-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Date-Delta Skip Simulation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Wondering what happens if you skip a fundamental concept? Our NetworkX DAG simulator calculates downstream friction days and blocked dependent nodes in real-time.
            </p>
          </div>

          {/* Card 3: ATS Market Radar & HMAC Proofs */}
          <div className="p-8 rounded-2xl bg-surface border border-border shadow-glass hover:border-brand-500/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Award className="text-cyan-400" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Market Radar & Proof Portfolio</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Live ATS scraper pulling verified openings from Canonical, Stripe, and Linear paired with HMAC-SHA256 tamper-evident proof credentials.
            </p>
          </div>
        </section>

        {/* CTA Footer Banner */}
        <section className="p-12 rounded-3xl bg-gradient-to-br from-surface to-surface-secondary border border-border shadow-glass text-center flex flex-col items-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Ready to Build Your Verified Career Path?
          </h2>
          <p className="text-slate-400 text-sm max-w-lg">
            Takes under 2 minutes. Enter your target career goal and let the Neo4j topological planner generate your shortest path.
          </p>
          <Link
            href="/diagnostic"
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-glow-indigo transition-all"
          >
            <span>Get Started Free</span>
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    </div>
  );
}
