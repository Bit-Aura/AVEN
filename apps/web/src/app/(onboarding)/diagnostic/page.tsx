'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathStore } from '../../../store/usePathStore';
import GoalChat from '../../../components/GoalChat';
import DiagnosticChat from '../../../components/DiagnosticChat';
import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';
import { SafeUserButton, useSafeUser } from '../../../lib/clerkSafe';

/**
 * Enterprise-grade implementation of DiagnosticPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function DiagnosticPage() {
  const router = useRouter();
  const { user, isLoaded } = useSafeUser();
  const nextQuestion = usePathStore((state) => state.nextQuestion);
  const diagnosticComplete = usePathStore((state) => state.diagnosticComplete);
  const userGoal = usePathStore((state) => state.userGoal);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const role = (user.role || 'LEARNER').toUpperCase();
    if (role === 'MENTOR') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pathfinder_diagnostic_complete', 'true');
      }
      usePathStore.setState({ diagnosticComplete: true });
      router.replace('/mentor');
    } else if (role === 'ADMIN') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pathfinder_diagnostic_complete', 'true');
      }
      usePathStore.setState({ diagnosticComplete: true });
      router.replace('/admin');
    }
  }, [user, isLoaded, router]);

  // Show GoalChat if no question is active and diagnostic is not complete
  const showGoalChat = !nextQuestion && !diagnosticComplete && !userGoal;

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between z-10">
        <Link 
          href="/"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <Compass size={14} className="text-brand-400" />
            <span>Cold-Start Diagnostic</span>
          </div>
          <SafeUserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 border border-white/20" } }} placement="bottom-right" />
        </div>
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center my-8 z-10">
        {showGoalChat ? <GoalChat /> : <DiagnosticChat />}
      </main>

      {/* Footer Note */}
      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-500 z-10">
        Deterministic planning is computed over Neo4j prerequisite subgraphs. AI explains decisions based strictly on ground-truth data.
      </footer>
    </div>
  );
}
