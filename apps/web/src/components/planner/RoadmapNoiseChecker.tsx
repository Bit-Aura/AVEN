'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  WarningCircle, 
  Lightning, 
  CircleNotch, 
  FileText,
  ShieldWarning,
  ShieldCheck,
  TrendDown,
  TrendUp,
  ArrowUpRight,
  ArrowDownRight,
  Buildings
} from '@phosphor-icons/react';
import { sanityCheckRoadmap } from '../../api/client';
import { usePathStore } from '../../store/usePathStore';

/**
 * Enterprise-grade implementation of SAMPLE_ROADMAPS.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
const SAMPLE_ROADMAPS = [
  {
    title: "Overhyped YouTube Roadmap",
    text: "Start directly with Kubernetes and Kafka. Then learn XML-RPC and SOAP API. After that, pick up Python and Django."
  },
  {
    title: "Pragmatic SWE Curriculum",
    text: "First learn Python basics and SQL relational database design. Next build HTTP REST APIs with FastAPI, then master PostgreSQL and system design."
  }
];

/**
 * Enterprise-grade implementation of RoadmapNoiseChecker.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function RoadmapNoiseChecker() {
  const targetRole = usePathStore((state) => state.targetRole);
  const [adviceText, setAdviceText] = useState(SAMPLE_ROADMAPS[0].text);
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (customText?: string) => {
    const textToSubmit = customText || adviceText;
    if (!textToSubmit || textToSubmit.length < 10) return;

    setIsLoading(true);
    setError(null);
    setReport(null); // Clear previous results to re-trigger stagger

    try {
      const res = await sanityCheckRoadmap({
        advice_text: textToSubmit,
        source_label: 'Curriculum Auditor',
        target_role: targetRole
      });
      setReport(res);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to analyze roadmap advice.");
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div layout className="w-full max-w-4xl flex flex-col gap-12 items-center relative font-sans mb-24">
      
      {/* TOP PANE: The Input Terminal */}
      <motion.div 
        layout 
        className="w-full flex flex-col gap-4"
      >
        <motion.div layout className="flex items-center justify-between pb-2 border-b border-aven-text/10">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-aven-text-subtle">
              Target Curriculum
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-aven-text uppercase tracking-widest">Presets:</span>
            {SAMPLE_ROADMAPS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setAdviceText(sample.text);
                  setReport(null);
                }}
                className="px-2 py-0.5 border border-aven-text/10 text-[10px] font-black text-aven-text-subtle hover:text-aven-text hover:bg-aven-surface transition-all uppercase tracking-widest"
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Textarea Container with Integrated Button and X-Ray */}
        <motion.div layout className="relative w-full overflow-hidden border border-aven-text/20 focus-within:border-aven-text transition-colors bg-aven-base">
          
          <textarea
            value={adviceText}
            onChange={(e) => setAdviceText(e.target.value)}
            disabled={isLoading}
            placeholder="Paste syllabus, transcript, or roadmap..."
            className="w-full h-[300px] bg-transparent p-6 pb-24 text-sm font-mono text-aven-text placeholder:text-aven-text-subtle/50 focus:outline-none resize-none leading-relaxed"
          />

          {/* X-Ray Scanner Animation */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ top: '-10%', opacity: 0 }}
                animate={{ top: '110%', opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
                className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent to-aven-text/5 border-b border-aven-text/20 pointer-events-none z-10"
              />
            )}
          </AnimatePresence>

          {/* Floating Action Button (Anti-Slop: Stark, high contrast) */}
          <div className="absolute bottom-6 right-6 z-20">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAnalyze()}
              disabled={isLoading || adviceText.length < 10}
              className="flex items-center gap-2 px-6 py-3 bg-aven-text text-aven-base disabled:bg-aven-surface disabled:text-aven-text-subtle font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-50 border border-aven-text shadow-sm"
            >
              {isLoading ? (
                <>
                  <CircleNotch weight="bold" size={16} className="animate-spin" />
                  <span>Scanning</span>
                </>
              ) : (
                <>
                  <Lightning weight="fill" size={16} />
                  <span>Audit Curriculum</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 border border-aven-text/20 bg-aven-surface text-aven-text text-xs font-mono flex items-center gap-2 mt-2"
          >
            <WarningCircle weight="fill" size={16} />
            <span>{error}</span>
          </motion.div>
        )}
      </motion.div>

      {/* BOTTOM PANE: X-Ray Results */}
      <AnimatePresence mode="wait">
        {report && !isLoading && (
          <motion.div 
            layout
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full flex flex-col gap-6"
          >
            <motion.div layout className="flex items-center gap-2 pb-2 border-b border-aven-text/10">
              <label className="text-[10px] font-black uppercase tracking-widest text-aven-text-subtle">
                Diagnostic Output
              </label>
            </motion.div>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="w-full flex flex-col gap-8"
            >
              {/* Verdict Header (Anti-Slop: Pure typography, no background box) */}
              <motion.div variants={itemVariants} className="flex flex-col gap-2 pb-6 border-b border-aven-text/10">
                <div className="text-[10px] font-mono uppercase tracking-widest text-aven-text-subtle flex items-center gap-2">
                  <span>System Verdict</span>
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    report.overall_rating === 'TRUSTWORTHY' || report.overall_rating === 'MOSTLY_OK'
                      ? 'bg-aven-text'
                      : 'bg-aven-text-subtle'
                  }`} />
                </div>
                <div className="text-3xl font-black text-aven-text tracking-tight">
                  {report.overall_rating.replace(/_/g, ' ')}
                </div>
                <p className="text-[15px] text-aven-text-subtle leading-relaxed max-w-2xl mt-3 font-medium">
                  {report.summary}
                </p>
              </motion.div>

              {/* Data Bar (Anti-Slop: Horizontal structural table, not 3 isolated cards) */}
              <motion.div variants={itemVariants} className="flex border border-aven-text/20 bg-aven-base">
                <div className="flex-1 p-5 border-r border-aven-text/20 flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-aven-text-subtle">Valid</span>
                  <span className="text-2xl font-black text-aven-text">{report.aligned_count}</span>
                </div>
                <div className="flex-1 p-5 border-r border-aven-text/20 flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-aven-text-subtle">Fluff</span>
                  <span className="text-2xl font-black text-aven-text">{report.harmless_extra_count}</span>
                </div>
                <div className="flex-1 p-5 flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-aven-text-subtle">Violations</span>
                  <span className={`text-2xl font-black text-aven-text`}>
                    {report.misleading_count}
                  </span>
                </div>
              </motion.div>

              {/* Line-by-Line Breakdown (Anti-Slop: Clean list with hairlines, no pill boxes) */}
              {report.verdicts && report.verdicts.length > 0 && (
                <motion.div variants={itemVariants} className="flex flex-col">
                  <div className="text-[10px] font-black uppercase tracking-widest text-aven-text-subtle pb-3 border-b border-aven-text/10">
                    Detailed Analysis
                  </div>
                  
                  <div className="flex flex-col">
                    {report.verdicts.map((v: any, idx: number) => {
                      const isAligned = v.label === 'ALIGNED';
                      const isMisleading = v.label === 'MISLEADING';
                      
                      return (
                        <div 
                          key={idx}
                          className="py-8 border-b border-aven-text/10 last:border-0 flex flex-col gap-4"
                        >
                          {/* Header: Skill Name & Verdict & Trend */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <h4 className="text-[17px] font-black text-aven-text">
                                {v.matched_skill_name || v.extracted_mention}
                              </h4>
                              
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm border ${
                                isAligned ? 'text-aven-text border-aven-text/20 bg-aven-surface' : 
                                isMisleading ? 'text-aven-base border-aven-text bg-aven-text' : 
                                'text-aven-text-subtle border-aven-text/10 bg-aven-surface'
                              }`}>
                                {isAligned ? 'VALIDATED' : isMisleading ? 'VIOLATION' : 'MARKET FLUFF'}
                              </span>
                            </div>

                            {/* Trend Indicator */}
                            {v.trend_direction && (
                              <div className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest ${
                                v.trend_direction === 'UP' ? 'text-aven-text' : 
                                v.trend_direction === 'DOWN' ? 'text-aven-text-subtle' : 
                                'text-aven-text-subtle'
                              }`}>
                                {v.trend_direction === 'UP' && <ArrowUpRight weight="bold" size={16} />}
                                {v.trend_direction === 'DOWN' && <ArrowDownRight weight="bold" size={16} />}
                                {v.trend_direction === 'STABLE' && <span>—</span>}
                                <span>{v.trend_direction}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Content: Analysis and Context */}
                          <div className="flex flex-col gap-3 mt-1">
                            <p className="text-[15px] text-aven-text font-medium leading-relaxed">
                              {v.reason}
                            </p>
                            
                            {v.market_context && (
                              <p className="text-[15px] text-aven-text-subtle font-medium leading-relaxed">
                                {v.market_context}
                              </p>
                            )}
                          </div>

                          {/* Footer: Top Companies */}
                          {v.top_companies && v.top_companies.length > 0 && (
                            <div className="flex items-center gap-3 mt-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-aven-text-subtle">
                                Hiring for this:
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {v.top_companies.map((comp: string, i: number) => (
                                  <span key={i} className="px-3 py-1 bg-aven-surface text-aven-text text-[11px] font-black uppercase tracking-widest rounded-md border border-aven-text/10">
                                    {comp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
