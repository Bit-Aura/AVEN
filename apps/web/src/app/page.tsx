'use client';

import Link from 'next/link';
import { OurProcessCards } from '../components/OurProcessCards';
import { TechStack } from '../components/TechStack';
import { FAQSection } from '../components/FAQSection';
import { Footer } from '../components/Footer';
import { AnimatedFeaturesGrid } from '../components/AnimatedFeaturesGrid';
import { SafeUserButton, useSafeUser } from '../lib/clerkSafe';
import { 
  ArrowRight, 
  ShieldCheck, 
  Network, 
  Award,
  LogIn,
  Sparkles
} from 'lucide-react';

/**
 * Enterprise-grade implementation of LandingPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function LandingPage() {
  const { user, isSignedIn, isLoaded } = useSafeUser();
  const role = user?.role || 'LEARNER';
  const dashboardHref = role === 'ADMIN' ? '/admin' : role === 'MENTOR' ? '/mentor' : '/learner';

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500&display=swap');

        .cinematic-hero {
          --background: 201 100% 13%;
          --foreground: 0 0% 100%;
          --muted-foreground: 240 4% 66%;
          background-color: hsl(var(--background));
          color: hsl(var(--foreground));
          font-family: 'Inter', sans-serif;
        }

        .cinematic-hero .font-display {
          font-family: 'Instrument Serif', serif;
        }

        .liquid-glass {
          background: rgba(255, 255, 255, 0.01);
          background-blend-mode: luminosity;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border: none;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }
        .liquid-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.4px;
          background: linear-gradient(180deg,
            rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
            rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
            rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        @keyframes fade-rise {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-rise { animation: fade-rise 0.8s ease-out both; }
        .animate-fade-rise-delay { animation: fade-rise 0.8s ease-out 0.2s both; }
        .animate-fade-rise-delay-2 { animation: fade-rise 0.8s ease-out 0.4s both; }
      `}} />

      <div className="bg-background text-slate-100 font-sans selection:bg-brand-500/30 overflow-x-clip">
        {/* CINEMATIC HERO SECTION */}
        <div className="cinematic-hero h-screen max-h-screen relative overflow-hidden flex flex-col">
          {/* VIDEO BACKGROUND */}
          <video 
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
            autoPlay 
            loop 
            muted 
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
          />

          {/* NAVIGATION BAR */}
          <nav className="relative z-10 flex flex-row justify-between items-center px-8 py-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <span className="font-display text-5xl md:text-6xl tracking-tight text-white">
                AVEN
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isLoaded && isSignedIn && user ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                  >
                    <span>Dashboard</span>
                    <ArrowRight size={13} />
                  </Link>
                  <SafeUserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10 border border-white/20" } }} placement="bottom-right" />
                </>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer backdrop-blur-md"
                  >
                    <LogIn size={13} />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-black bg-white hover:bg-white/90 shadow-md transition-all cursor-pointer"
                  >
                    <span>Get Started</span>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* HERO CONTENT */}
          <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pb-[20vh] md:pb-[30vh] w-full">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass text-[#a1a1aa] text-xs font-medium mb-6 animate-fade-rise">
              <span>Deterministic Prerequisite Graphs • Zero LLM Hallucinations</span>
            </div>

            <h1 className="text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-7xl font-normal font-display text-white animate-fade-rise">
              Stop Guessing. <br/>
              <em className="not-italic text-[hsl(var(--muted-foreground))]">Start Knowing Your Real Readiness.</em>
            </h1>

            <p className="text-[hsl(var(--muted-foreground))] text-base sm:text-lg max-w-2xl mt-6 leading-relaxed animate-fade-rise-delay">
              An AI-native career intelligence engine that builds topologically sound skill paths, tracks Bayesian Knowledge Tracing priors, and cryptographically signs your portfolio.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-10 animate-fade-rise-delay-2">
              <Link
                href="/diagnostic"
                className="liquid-glass rounded-full px-10 py-4 text-base text-white hover:scale-[1.03] active:scale-95 cursor-pointer transition-transform"
              >
                Launch Cold-Start Diagnostic
              </Link>
              <Link
                href="/learner"
                className="liquid-glass rounded-full px-10 py-4 text-base text-white hover:scale-[1.03] active:scale-95 cursor-pointer transition-transform"
              >
                Explore Active Dashboard
              </Link>
            </div>
          </main>
        </div>

        {/* REST OF PAGE - UNIFIED LIGHT BACKGROUND */}
        <div className="relative w-full bg-white z-10">
          {/* Global Dot Grid for all sections below hero */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.15]" 
            style={{ 
              backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <main className="max-w-7xl mx-auto px-6 py-24 space-y-32 relative z-10">
            {/* Feature Grid (Tensorik UI Style) */}
          <AnimatedFeaturesGrid />
        </main>

        <OurProcessCards />
        <TechStack />
        <FAQSection />

        <main className="max-w-7xl mx-auto px-6 py-24 space-y-32 relative z-10">
          {/* CTA Footer Banner */}
          <section className="relative overflow-hidden p-16 md:p-24 rounded-[32px] bg-[radial-gradient(circle_at_center,_#333_0%,_#18181b_100%)] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-center flex flex-col items-center justify-center">
            {/* Ambient Blue Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] md:w-[60%] h-[150%] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center">
              <h2 className="text-4xl md:text-6xl font-display font-normal tracking-tight text-white max-w-3xl leading-[1.1]">
                Ready to Build Your Verified Career Path?
              </h2>
              <p className="text-[#cccccc] text-base md:text-lg max-w-2xl mt-6 leading-relaxed">
                Takes under 2 minutes. Enter your target career goal and let the Neo4j topological planner generate your shortest path.
              </p>
              
              <Link
                href="/diagnostic"
                className="mt-10 flex items-center gap-2 px-10 py-4 rounded-full liquid-glass text-white font-bold text-base shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-transform hover:scale-[1.03] active:scale-95"
              >
                <span>Get Started Free</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <Footer />
        
        </div> {/* END OF UNIFIED LIGHT BACKGROUND */}
      </div>
    </>
  );
}
