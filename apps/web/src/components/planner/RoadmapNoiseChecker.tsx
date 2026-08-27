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
  Buildings
} from '@phosphor-icons/react';
import { checkRoadmapSanity } from '../../api/client';
import { usePathStore } from '../../store/usePathStore';

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
      const res = await checkRoadmapSanity({
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
    <motion.div layout className="w-full max-w-4xl mx-auto flex flex-col gap-12 items-center relative font-sans mb-24">
      
      {/* TOP PANE: The Input Terminal */}
      <motion.div 
        layout 
        className="w-full flex flex-col gap-4"
      >
        <motion.div layout className="flex items-center justify-between pb-2 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Target Curriculum
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Presets:</span>
            {SAMPLE_ROADMAPS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setAdviceText(sample.text);
                  setReport(null);
                }}
                className="px-2 py-0.5 border border-slate-700 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all uppercase tracking-widest"
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Textarea Container with Integrated Button and X-Ray */}
        <motion.div layout className="relative w-full overflow-hidden border border-slate-700 group focus-within:border-slate-500 transition-colors bg-[#0b0f19]">
          
          <textarea
            value={adviceText}
            onChange={(e) => setAdviceText(e.target.value)}
            disabled={isLoading}
            placeholder="Paste syllabus, transcript, or roadmap..."
            className="w-full h-[300px] bg-transparent p-6 pb-24 text-sm font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none resize-none leading-relaxed"
          />

          {/* X-Ray Scanner Animation */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ top: '-10%', opacity: 0 }}
                animate={{ top: '110%', opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
                className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent to-indigo-500/10 border-b border-indigo-400/50 pointer-events-none z-10"
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
              className="flex items-center gap-2 px-6 py-3 bg-white text-slate-950 disabled:bg-slate-800 disabled:text-slate-500 font-bold text-[11px] uppercase tracking-widest transition-all disabled:opacity-50 border border-white disabled:border-slate-700 shadow-sm"
              style={{ color: isLoading || adviceText.length < 10 ? undefined : '#0f172a' }} // Hardcode color to fix tailwind override issue
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
            className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-mono flex items-center gap-2 mt-2"
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
            <motion.div layout className="flex items-center gap-2 pb-2 border-b border-slate-700">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
              <motion.div variants={itemVariants} className="flex flex-col gap-2 pb-6 border-b border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <span>System Verdict</span>
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    report.overall_rating === 'TRUSTWORTHY' || report.overall_rating === 'MOSTLY_OK'
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`} />
                </div>
                <div className="text-3xl font-light text-white tracking-tight">
                  {report.overall_rating.replace(/_/g, ' ')}
                </div>
                <p className="text-[15px] text-slate-300 leading-relaxed max-w-2xl mt-3 font-medium">
                  {report.summary}
                </p>
              </motion.div>

              {/* Data Bar (Anti-Slop: Horizontal structural table, not 3 isolated cards) */}
              <motion.div variants={itemVariants} className="flex border border-slate-700 bg-slate-900/50">
                <div className="flex-1 p-5 border-r border-slate-700 flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Valid</span>
                  <span className="text-2xl font-light text-white">{report.aligned_count}</span>
                </div>
                <div className="flex-1 p-5 border-r border-slate-700 flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Fluff</span>
                  <span className="text-2xl font-light text-white">{report.harmless_extra_count}</span>
                </div>
                <div className="flex-1 p-5 flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-rose-500/70">Violations</span>
                  <span className={`text-2xl font-light ${report.misleading_count > 0 ? 'text-rose-400' : 'text-white'}`}>
                    {report.misleading_count}
                  </span>
                </div>
              </motion.div>

              {/* Line-by-Line Breakdown (Anti-Slop: Clean list with hairlines, no pill boxes) */}
              {report.verdicts && report.verdicts.length > 0 && (
                <motion.div variants={itemVariants} className="flex flex-col">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pb-3 border-b border-slate-700">
                    Detailed Analysis
                  </div>
                  
                  <div className="flex flex-col">
                    {report.verdicts.map((v: any, idx: number) => {
                      const isAligned = v.label === 'ALIGNED';
                      const isMisleading = v.label === 'MISLEADING';
                      
                      return (
                        <div 
                          key={idx}
                          className="py-8 border-b border-slate-800/50 last:border-0 flex flex-col gap-4"
                        >
                          {/* Header: Skill Name & Verdict & Trend */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <h4 className="text-[17px] font-semibold text-slate-100">
                                {v.matched_skill_name || v.extracted_mention}
                              </h4>
                              
                              <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-sm border ${
                                isAligned ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 
                                isMisleading ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' : 
                                'text-amber-400 border-amber-500/20 bg-amber-500/10'
                              }`}>
                                {isAligned ? 'VALIDATED' : isMisleading ? 'VIOLATION' : 'MARKET FLUFF'}
                              </span>
                            </div>

                            {/* Trend Indicator */}
                            {v.trend_direction && (
                              <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest ${
                                v.trend_direction === 'UP' ? 'text-emerald-400' : 
                                v.trend_direction === 'DOWN' ? 'text-rose-400' : 
                                'text-slate-500'
                              }`}>
                                {v.trend_direction === 'UP' && <TrendUp weight="bold" size={16} />}
                                {v.trend_direction === 'DOWN' && <TrendDown weight="bold" size={16} />}
                                {v.trend_direction === 'STABLE' && <span>—</span>}
                                <span>{v.trend_direction}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Content: Analysis and Context */}
                          <div className="flex flex-col gap-3 mt-1">
                            <p className="text-[15px] text-slate-300 leading-relaxed font-normal">
                              {v.reason}
                            </p>
                            
                            {v.market_context && (
                              <p className="text-[15px] text-slate-400 leading-relaxed font-normal">
                                {v.market_context}
                              </p>
                            )}
                          </div>

                          {/* Footer: Top Companies */}
                          {v.top_companies && v.top_companies.length > 0 && (
                            <div className="flex items-center gap-3 mt-3">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                Hiring for this:
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {v.top_companies.map((comp: string, i: number) => (
                                  <span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 text-[11px] font-semibold rounded-md">
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
